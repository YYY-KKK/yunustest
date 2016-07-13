package com.mcdonalds.dtest.actor;

import com.mcdonalds.dtest.contracts.ILogger;
import com.mcdonalds.dtest.contracts.ITestActor;
import com.mcdonalds.dtest.contracts.ISharedData;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;
import java.math.BigInteger;
import java.net.URISyntaxException;
import java.security.CodeSource;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import com.google.gson.*;
import com.mcdonalds.dtest.actor.http.ContentType;
import com.mcdonalds.dtest.actor.http.HttpRequest;
import com.mcdonalds.dtest.actor.http.HttpVerb;
import com.mcdonalds.dtest.actor.SessionStatusResponse;

/**
 * TestActor
 */
public class TestActor implements ITestActor {
	/** The string identifier of the actor */
	private String actorId;
	
	/** Identifies the type of actor (GMA, NP6, etc.) */
	private String actorType;
	
	private Thread announceThread;
	
	private Boolean actorIsStopping;
	
	private Properties config;
	
	private int currentStepIndex;
	
	private Boolean currentStepIsCompleted;
	
	private Object currentTest;
	
	private String currentTestGroup;
	
	private String currentTestName;
	
	private int currentTestIndex;
	
	private CloseableHttpClient httpClient;
	
	private HttpLogger log;
	
	private Boolean sessionIsCompleted;
	
	private String syncServiceBaseUrl;
	
	private String testsBasePackageName;
	
	/**
	 * The string identifier of the current test session, if any. If not
	 * null, it means that this test actor was acquired by the sync service
	 * and allocated to a particular test session */
	private String testSessionId;
	
	public TestActor() throws URISyntaxException, IOException, ClassNotFoundException {		
		config = getConfiguration();
		this.actorId = config.getProperty("actorId");
		this.actorType = config.getProperty("actorType");
		this.syncServiceBaseUrl = config.getProperty("syncServiceBaseUrl");
		this.testsBasePackageName = config.getProperty("testsBasePackageName").replaceAll("^[\\.\\s]+|[\\.\\s]+$", "");
		
		if(this.actorId == null || this.actorId.isEmpty()) {
			SecureRandom random = new SecureRandom();
			this.actorId = new BigInteger(16, random).toString(10);;
		}
		this.actorIsStopping = false;
		this.currentStepIndex = -1;
		this.currentTestIndex = -1;
		this.httpClient = HttpClients.createDefault();
		this.log = new HttpLogger(syncServiceBaseUrl, testSessionId, null);
		this.sessionIsCompleted = false;
		
		startAnnounceThread();
	}
	
	/**
	 * Announces the actor to the sync service, so it can be used for
	 * running a test session
	 */
	private void announce() {
		try {
			HttpRequest request = new HttpRequest(syncServiceBaseUrl + "/api/actor/announce", HttpVerb.POST);
			request.setContent(String.format("{\"actorId\":\"%s\",\"actorType\":\"%s\"}", actorId, actorType), ContentType.APPLICATION_JSON);
			request.execute();
			
			String response = request.getResponseAsString();
			JsonElement jelement = new JsonParser().parse(response);
			JsonElement testSessionIdElem = jelement.getAsJsonObject().get("testSessionId");
		    
		    if (!testSessionIdElem.isJsonNull()) {
		    	testSessionId = testSessionIdElem.getAsString();
		    }
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	private void executeTestStep(int currentStepIndex) {
		try {
			HttpRequest request = new HttpRequest(
					String.format("%s/api/session/%s/actor/%s/test/%s/step/%s",
						syncServiceBaseUrl,
						testSessionId,
						actorId,
						currentTestIndex,
						currentStepIndex),
					HttpVerb.PUT);
			request.setContent("{\"status\":\"started\",\"result\":\"passed\"}", ContentType.APPLICATION_JSON);
			request.execute();
			
			// Identify test step method
			Method stepMethod = Reflection.getStepMethod(currentTest, currentStepIndex);
			
			if (stepMethod != null) {
				log.info(String.format("Executing %s.%s, step %s...",
						currentTestGroup,
						currentTestName,
						currentStepIndex));

				// Execute test step method on the current test object
				stepMethod.invoke(currentTest);		
			}
			
			request.setContent("{\"status\":\"completed\",\"result\":\"passed\"}", ContentType.APPLICATION_JSON);
			request.execute();
			
			// TODO Report that step method executed successfully
		} catch(Exception e) {
			Throwable cause = e.getCause();
			String exceptionMessage = cause != null ? cause.getMessage() : e.getMessage();
			String message = String.format("Failed executing %s.%s, step %s. %s",
				currentTestGroup,
				currentTestName,
				currentStepIndex,
				exceptionMessage != null ? exceptionMessage : "");
			log.error(message);
			

			StringWriter sw = new StringWriter();
			e.printStackTrace(new PrintWriter(sw));
			log.error(sw.toString());
		}
	}
	
	private Properties getConfiguration() throws IOException, URISyntaxException, ClassNotFoundException {
		// Identify the main class that started the application. The location of the
		// JAR file containing the main class is where we'll look for the config file
		StackTraceElement[] elements = new Exception().getStackTrace();
	    Class<?> mainClass = Class.forName(elements[elements.length - 1].getClassName());
	    
		CodeSource codeSource = mainClass.getProtectionDomain().getCodeSource();
		File jarFile = new File(codeSource.getLocation().toURI().getPath());
		File jarDir = jarFile.getParentFile();

		if (jarDir != null && jarDir.isDirectory()) {
			// If we're running the code in the IDE, it will not be packaged as JAR
			// and the CLASS files will reside in the "test-classes" directory. However,
			// the config file is found one directory up the path
			if (jarDir.getName() == "test-classes") {
				jarDir = jarDir.getParentFile();
			}
			
			File propFile = new File(jarDir, "TestActor.properties");
			InputStream fileInputStream = new FileInputStream(propFile);
			Properties prop = new Properties();
			prop.load(fileInputStream);
			return prop;
		} else {
			throw new FileNotFoundException();
		}
	}
	
	private SessionStatusResponse getTestSessionStatus() {
		try {
			SessionStatusResponse sessionStatus = new SessionStatusResponse();
			
			HttpRequest request = new HttpRequest(
					String.format("%s/api/session/%s/status",
						syncServiceBaseUrl,
						testSessionId),
					HttpVerb.GET);
			request.execute();
			
			String responseString = request.getResponseAsString();
			JsonElement responseElement = new JsonParser().parse(responseString);
			JsonObject responseObj = responseElement.getAsJsonObject();
			sessionStatus.status = responseObj.get("status").getAsString();
			if (sessionStatus.status.equals("started")) {
				sessionStatus.currentStepIndex = responseObj.get("currentStepIndex").getAsInt();
				sessionStatus.currentTestGroup = responseObj.get("currentTestGroup").getAsString();
				sessionStatus.currentTestIndex = responseObj.get("currentTestIndex").getAsInt();
				sessionStatus.currentTestName = responseObj.get("currentTestName").getAsString();
			}
			
			return sessionStatus;
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		return null;
	}
	
	/**
	 * Announces the actor to the sync service and does the work for only one
	 * test session, then returns
	 * @throws Exception 
	 */
	public void runOneSession(Duration maxWaitTime) throws Exception {
		testSessionId = null;
		
		Duration waitTime = Duration.ofSeconds(0);
		try {
			if (testSessionId == null) {
				log.info(String.format("Actor %s of type %s is waiting to be acquired by a test session...", actorId, actorType));
			}
			
			// Wait until this actor is acquired by a test session. The testSessionId
			// field is populated in the announce thread.
			while (testSessionId == null) {
				try {
					Thread.sleep(1000);
					if (waitTime.compareTo(maxWaitTime) > 0){
						throw new Exception("The maximum wait time was exceeded while waiting for a test session to start");
					}
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
			
			HashMap<String, String> actorLogContext = new HashMap<String, String>();
			actorLogContext.put("actorId", actorId);
			actorLogContext.put("actorType", actorType);
			log = new HttpLogger(syncServiceBaseUrl, testSessionId, actorLogContext);
			log.info(String.format("Actor %s was acquired by test session %s", actorId, testSessionId));
			
			// Start querying the session status and executing the tests
			while (!sessionIsCompleted) {
				SessionStatusResponse sessionStatus = getTestSessionStatus();
				
				if (sessionStatus.status.equals("started")) {
					
					if (currentTestIndex < sessionStatus.currentTestIndex) {
						this.currentTest = null;
						currentTestIndex = sessionStatus.currentTestIndex;
						currentTestGroup = sessionStatus.currentTestGroup;
						currentTestName = sessionStatus.currentTestName;
						currentStepIndex = -1;
						
						// Identify and instantiate the test class
						String testClassFullName = String.format("%s.%s.%s",
								testsBasePackageName,
								sessionStatus.currentTestGroup,
								sessionStatus.currentTestName);
						Class<?> testClass = Class.forName(testClassFullName);
						currentTest = testClass.newInstance();
						
						// Inject dependencies into the test class
						// TODO Add context to the log entries (test group, test name, etc.)
						HashMap<String, String> testLogContext = new HashMap<String, String>();
						testLogContext.put("actorId", actorId);
						testLogContext.put("actorType", actorType);
						ILogger testLogger = new HttpLogger(syncServiceBaseUrl, testSessionId, testLogContext);
						Injector.inject(currentTest, testLogger);
						ISharedData sharedData = new SharedData(syncServiceBaseUrl, testSessionId, currentTestIndex);
						Injector.inject(currentTest, sharedData);
					}
					
					if (currentTestIndex == sessionStatus.currentTestIndex) {
						if (currentStepIndex < sessionStatus.currentStepIndex) {
							currentStepIndex = sessionStatus.currentStepIndex;
							currentStepIsCompleted = false;
						}
						
						if (!currentStepIsCompleted && currentStepIndex == sessionStatus.currentStepIndex) {
							executeTestStep(sessionStatus.currentStepIndex);
							currentStepIsCompleted = true;
						}
					}
				} else if (sessionStatus.status.equals("completed")) {
					log.info(String.format("Test session %s has completed", testSessionId));
					sessionIsCompleted = true;
				}
				
				try {
					Thread.sleep(1000);
				} catch (InterruptedException e) {}
			}
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			stop();
		}
		
		testSessionId = null;
		
		
	}
	
	public void runOneSession() throws Exception {
		runOneSession(Duration.ofMinutes(5));
	}
	
	private void stop() {
		actorIsStopping = true;
		
		if (announceThread != null) {
			announceThread.interrupt();
		}
	}
	
	private void startAnnounceThread() {
		announceThread = new Thread() {
		    public void run() {
		        try {
		        	while (!actorIsStopping) {
			        	announce();
			            Thread.sleep(5000);
		        	}
		        } catch(InterruptedException e) {
		        } catch(Exception e) {
		        	e.printStackTrace();
		        }
		    }  
		};

		announceThread.start();
	}

}

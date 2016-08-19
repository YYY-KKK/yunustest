package dtest.actor;

import com.google.gson.*;
import dtest.actor.yaml.SkipNullRepresenter;
import dtest.base.ConsoleLogger;
import dtest.base.HttpLogger;
import dtest.base.TestAction;
import dtest.base.contracts.ILogger;
import dtest.base.contracts.ITestActor;
import dtest.base.exceptions.ParameterNotFoundException;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequest;
import dtest.base.http.HttpVerb;
import dtest.base.testdef.MacroDefinition;
import dtest.base.testdef.TestDefAction;
import dtest.base.testdef.TestDefActor;
import dtest.base.testdef.TestDefStep;
import dtest.base.testdef.TestDefinition;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Field;
import java.math.BigInteger;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.CodeSource;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.parser.ParserException;

/**
 * Implements the core functionality for a test actor: reads the configuration
 * from a properties file, announces the actor to the sync service, then
 * identifies, parses and executes the tests, as orchestrated by the sync
 * service.
 */
public class TestActor implements ITestActor {

    /**
     * The string identifier of the actor
     */
    private String actorId;

    /**
     * Identifies the type of actor (GMA, NP6, etc.)
     */
    private final String actorType;

    private Thread announceThread;

    /**
     * Flags all threads and activities to shut down
     */
    private boolean actorIsStopping;

    private final Properties config;

    /** A reference to the current test action being executed */
    private TestAction currentAction;
    
    private int currentStepIndex;

    private String currentScript;

    private boolean currentStepIsCompleted;

    private TestDefinition currentTest;

    private String currentTestPath;

    private String currentTestName;

    private int currentTestIndex;

    private CloseableHttpClient httpClient;

    private ILogger log;

    /**
     * The arguments for the current macro action being executed (if any)
     */
    private Map<String, Object> macroArgs;

    /**
     * Caches macro definitions so we don't have to load them from disk every
     * time they're used
     */
    private Map<String, MacroDefinition> macroCache;

    private ScriptEngine scriptEngine;

    private boolean sessionHasCompleted;

    private final String syncServiceBaseUrl;

    private final String testsBasePackageName;

    private final String testRepoDirName;

    private String testRepoLocation;

    /**
     * The string identifier of the current test session, if any. If not null,
     * it means that this test actor was acquired by the sync service and
     * allocated to a particular test session
     */
    private String testSessionId;

    public TestActor() throws URISyntaxException, IOException, ClassNotFoundException {
        this.log = new ConsoleLogger();
        this.log.info("");

        config = getConfiguration();

        this.actorId = getStringParameter("actorId", "");
        this.actorType = getStringParameter("actorType");
        this.syncServiceBaseUrl = getStringParameter("syncServiceBaseUrl").replaceAll("^[\\s]+|[/\\s]+$", "");
        this.testsBasePackageName = getStringParameter("testsBasePackageName", "").replaceAll("^[\\.\\s]+|[\\.\\s]+$", "");
        this.testRepoDirName = getStringParameter("testRepoDirName", "").replaceAll("^[\\\\/\\s]+|[\\\\\\/\\s]+$", "");
        this.testRepoLocation = getStringParameter("testRepoLocation", "");
        this.testRepoLocation = this.testRepoLocation.replaceAll("^[\\s]+|[\\\\\\/\\s]+$", "");

        if (!new File(testRepoLocation).exists()) {
            throw new FileNotFoundException("The test repository directory could not be found. You can use the testRepoRootDir parameter to configure it.");
        }

        if (this.actorId == null || this.actorId.isEmpty()) {
            SecureRandom random = new SecureRandom();
            this.actorId = new BigInteger(16, random).toString(10);
        }
        this.actorIsStopping = false;
        this.httpClient = HttpClients.createDefault();
        this.log = new HttpLogger(syncServiceBaseUrl, testSessionId, null);

        startAnnounceThread();
    }

    private void abandonSession() {
        this.sessionHasCompleted = true;
        this.testSessionId = null;
    }

    /**
     * Announces the actor to the sync service, so it can be used for running a
     * test session
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

    /**
     * Sets a flag that signals all threads and activities for this actor to
     * shut down.
     */
    @Override
    public void close() {
        actorIsStopping = true;
    }

    private Object evalScriptFile(String scriptFileFullPath) throws ScriptException, FileNotFoundException {
        Path scriptPath = Paths.get(scriptFileFullPath);

        if (Files.exists(scriptPath)) {
            this.currentScript = scriptPath.toString();
        }

        return this.scriptEngine.eval(new FileReader(scriptPath.toString()));
    }

    private void executeAction(TestDefAction actionDef) throws Exception {
        Class actionClass;
        try {
            // Added for backward compatibility and will be removed eventually
            if (actionDef.action == null) {
                actionDef.action = actionDef.type;
                actionDef.type = null;
            }

            if (actionDef.action != null) {
                actionClass = Class.forName(actionDef.action);

                if (TestAction.class.isAssignableFrom(actionClass)) {
                    TestAction actionInstance = (TestAction) actionClass.newInstance();
                    this.currentAction = actionInstance;
                    
                    // Inject the logger instance into the action
                    Field[] fields = TestAction.class.getDeclaredFields();
                    for (Field f : fields) {
                        if (f.getType().isAssignableFrom(ILogger.class)) {
                            f.setAccessible(true);
                            f.set(actionInstance, this.log);
                            f.setAccessible(false);
                        }
                    }
                    
                    writeActionArguments(actionDef.args, actionInstance);
                    actionInstance.initialize();
                    actionInstance.run();
                } else {
                    throw new Exception(String.format("Class %s is not a test action class and cannot be used in test definitions",
                            actionDef.action));
                }
            } else if (actionDef.script != null) {
                actionDef.action = ScriptAction.class.getName();

                try {
                    scriptEngine.eval(actionDef.script);
                } catch (ScriptException ex) {
                    throw new RuntimeException(String.format(
                            "There was an error running a script while processing a script action. The script content was: %s",
                            actionDef.script), ex);
                }
            } else if (actionDef.macro != null) {
                try {
                    String macroRelativePath = actionDef.macro.replaceAll("[\\.\\\\]", "/") + ".yaml";

                    // Identify and parse the macro definition file
                    String macroFullPath = Paths.get(
                            testRepoLocation,
                            testRepoDirName,
                            "libs",
                            "macros",
                            macroRelativePath).toString();
                    MacroDefinition macroDef = parseMacroDefinition(macroFullPath);
                    executeMacroAction(macroDef, actionDef.args);
                } catch (Exception ex) {
                    throw new Exception(String.format("There was an error running macro action %s.",
                            actionDef.macro), ex);
                }
            }

            // Interpret and publish values in the test's shared data
            if (actionDef.sharedData != null) {
                Map<String, Object> sharedData = new HashMap<String, Object>();

                for (Map.Entry<String, Object> entry : actionDef.sharedData.entrySet()) {
                    sharedData.put(entry.getKey(), interpretValue(entry.getValue().toString()));
                }

                HttpRequest request = new HttpRequest(
                        String.format("%s/api/session/%s/test/%s/data",
                                syncServiceBaseUrl,
                                testSessionId,
                                currentTestIndex),
                        HttpVerb.PUT);

                Gson gson = new GsonBuilder().create();
                String jsonData = gson.toJson(sharedData);
                request.setContent(jsonData, ContentType.APPLICATION_JSON);
                request.execute();
            }
        } catch (ClassNotFoundException ex) {
            throw new RuntimeException(String.format(
                    "Failed to find action class \"%s\". Make sure the action type is correct in the test definition file and the JAR file where the class is implemented exists in the CLASSPATH.",
                    actionDef.action), ex);
        } catch (InstantiationException | IllegalAccessException ex) {
            throw new RuntimeException(String.format(
                    "Failed to instantiate action class \"%s\".",
                    actionDef.action), ex);
        }
    }

    private void executeMacroAction(MacroDefinition macroDef, Map<String, Object> macroArgs) throws Exception {
        this.macroArgs = macroArgs;

        // Execute the actions for the current macro, in the order
        // they appear in the macro definition file
        if (macroDef.actions != null) {
            for (TestDefAction actionDef : macroDef.actions) {
                try {
                    executeAction(actionDef);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format(
                            "There was an error while running action %s (with index %s) while executing a macro action.",
                            actionDef.action,
                            macroDef.actions.indexOf(actionDef)), ex);
                }
            }
        }

        this.macroArgs = null;
    }

    private void executeTestStep(int stepIndex) {
        // Notify the sync service that the step execution is starting
        HttpRequest stepStatusRequest = new HttpRequest(
                String.format("%s/api/session/%s/actor/%s/test/%s/step/%s",
                        syncServiceBaseUrl,
                        testSessionId,
                        actorId,
                        currentTestIndex,
                        stepIndex),
                HttpVerb.PUT);
        stepStatusRequest.setContent("{\"status\":\"started\",\"result\":\"pending\"}", ContentType.APPLICATION_JSON);
        stepStatusRequest.execute();

        try {
            // Identify the actor node in the test definition data
            Optional<TestDefActor> testDefActorOpt = currentTest.actors.stream()
                    .filter(a -> a.actorType.equals(this.actorType)).findFirst();
            if (testDefActorOpt.isPresent()) {
                Optional<TestDefStep> testDefStepOpt = testDefActorOpt.get().steps.stream()
                        .filter(s -> s.index == stepIndex).findFirst();
                if (testDefStepOpt.isPresent() && (testDefStepOpt.get().actions != null)) {
                    log.info(String.format("Executing step %s of test %s/%s...",
                            stepIndex,
                            currentTestPath,
                            currentTestName));

                    // Execute the actions for the current step, in the order
                    // they appear in the test definition file
                    for (TestDefAction actionDef : testDefStepOpt.get().actions) {
                        try {
                            executeAction(actionDef);
                            this.currentAction = null;
                        } catch (Exception ex) {
                            String actionName = actionDef.action != null
                                    ? actionDef.action
                                    : actionDef.macro != null
                                            ? actionDef.macro
                                            : actionDef.script != null ? "of type script" : "?";

                            final DumperOptions options = new DumperOptions();
                            options.setDefaultFlowStyle(DumperOptions.FlowStyle.FLOW);
                            options.setPrettyFlow(true);

                            SkipNullRepresenter representer = new SkipNullRepresenter();
                            representer.addClassTag(TestDefAction.class, Tag.MAP);

                            Yaml yaml = new Yaml(representer, options);
                            String actionDefYaml = yaml.dump(actionDef);

                            throw new RuntimeException(String.format(
                                    "There was an error while running action %s (with index %s) in step %s of test %s/%s. The action definition was:\n%s",
                                    actionName,
                                    testDefStepOpt.get().actions.indexOf(actionDef),
                                    stepIndex,
                                    currentTestPath,
                                    currentTestName,
                                    actionDefYaml), ex);
                        }
                    }
                }
            }

            // Notify the sync service that the step execution was completed
            stepStatusRequest.setContent("{\"status\":\"completed\",\"result\":\"passed\"}", ContentType.APPLICATION_JSON);
            stepStatusRequest.execute();
        } catch (Exception e) {
            Throwable cause = e.getCause();
            String exceptionMessage = cause != null ? cause.getMessage() : e.getMessage();
            String message = String.format("Failed executing test %s/%s, step %s. %s",
                    currentTestPath,
                    currentTestName,
                    stepIndex,
                    exceptionMessage != null ? exceptionMessage : "");
            log.error(message);

            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            log.error(sw.toString());

            // Notify the sync service that the step execution failed
            stepStatusRequest.setContent("{\"status\":\"completed\",\"result\":\"failed\"}", ContentType.APPLICATION_JSON);
            stepStatusRequest.execute();
        }
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        close();
    }

    /**
     * Determines whether a string value is a script and returns the interpreted
     * value of that string if it's a script, or the plain string value
     * otherwise.
     */
    private Object interpretValue(String value) {
        if (value.matches("(?s)^[\\s\\n]*(\\$data|\\$script|\\$macroArgs|\\$sharedData|\\$out).*")) {
            // Remove the $script syntax from the beggining of the string
            value = value.replaceAll("^\\s*\\$script\\s*", "");

            try {
                return scriptEngine.eval(value);
            } catch (ScriptException ex) {
                throw new RuntimeException(String.format(
                        "An error was encountered while running a script. The script content was: %s",
                        value), ex);
            }
        } else {
            return value;
        }
    }

    private Properties getConfiguration() throws IOException, URISyntaxException, ClassNotFoundException {
        try {
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
                if (jarDir.getName().equals("test-classes")) {
                    jarDir = jarDir.getParentFile();
                }

                File propFile = new File(jarDir, "TestActor.properties");
                InputStream fileInputStream;

                try {
                    fileInputStream = new FileInputStream(propFile);
                } catch (Exception e) {
                    log.info(String.format("Loading configuration from main JARs resources...", propFile.toString()));
                    fileInputStream = getClass().getResourceAsStream("/TestActor.properties");
                }

                Properties prop = new Properties();
                prop.load(fileInputStream);
                return prop;
            } else {
                throw new FileNotFoundException("Failed to identify the directory where the main JAR file is located in");
            }
        } catch (Exception ex) {
            throw new RuntimeException("Failed to load test actor configuration file", ex);
        }
    }

    private Object getData(String path) {
        return null;
    }

    private String getDataDirFullPath() {
        Path testRepoFullPath = Paths.get(testRepoLocation, testRepoDirName);
        Path testRepoConfigPath = Paths.get(testRepoLocation, testRepoDirName, "test-repo.yaml");
        Yaml yaml = new Yaml();
        String dataDirName = null;

        try {
            Object repoConfig = yaml.load(new FileInputStream(testRepoConfigPath.toString()));
            if (repoConfig != null) {
                dataDirName = ((Map<String, String>) repoConfig).get("dataDir");
            }
        } catch (FileNotFoundException ex) {
        }

        Path dataDirFullPath;

        if (dataDirName != null && !dataDirName.isEmpty()) {
            dataDirFullPath = Paths.get(testRepoFullPath.toString(), dataDirName);
        } else {
            dataDirFullPath = Paths.get(testRepoFullPath.toString(), "data");
        }

        if (Files.exists(dataDirFullPath)) {
            return dataDirFullPath.toString();
        } else {
            throw new RuntimeException(String.format(
                    "The test data directory \"%s\" does not exist",
                    dataDirFullPath.toString()));
        }
    }

    private String getScriptssDirFullPath() {
        return Paths.get(testRepoLocation, testRepoDirName, "libs", "scripts").toString();
    }

    private String getStringParameter(String parmeterName, String defaultValue) throws ParameterNotFoundException {
        String parameterValue = config.getProperty(parmeterName);
        if (parameterValue != null) {
            return parameterValue;
        } else if (defaultValue != null) {
            return defaultValue;
        } else {
            throw new ParameterNotFoundException(String.format("Parameter %s was not found", parmeterName));
        }
    }

    private String getStringParameter(String parmeterName) {
        return getStringParameter(parmeterName, null);
    }

    private String getTestsDirFullPath() {
        return Paths.get(testRepoLocation, testRepoDirName, "tests").toString();
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
            Integer statusCode = request.getResponseStatusCode();

            if (statusCode < 300) {
                String responseString = request.getResponseAsString();
                if (responseString != null) {
                    JsonElement responseElement = new JsonParser().parse(responseString);
                    JsonObject responseObj = responseElement.getAsJsonObject();
                    sessionStatus.status = responseObj.get("status").getAsString();
                    if (sessionStatus.status.equals("started")) {
                        sessionStatus.currentStepIndex = responseObj.get("currentStepIndex").getAsInt();
                        sessionStatus.currentTestPath = responseObj.get("currentTestPath").getAsString();
                        sessionStatus.currentTestIndex = responseObj.get("currentTestIndex").getAsInt();
                        sessionStatus.currentTestName = responseObj.get("currentTestName").getAsString();
                    }

                    return sessionStatus;
                }
            } else if (statusCode == 404) {
                // When we receive a 404, it means the session died
                abandonSession();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }

    private void initializeScriptEngine() {
        this.scriptEngine = new ScriptEngineManager().getEngineByName("nashorn");

        // Keeping a final reference to the current actor instance, so that we
        // can access it from anonymous classes below
        final TestActor actor = this;

        // $data
        this.scriptEngine.put("$data", new Function<String, Object>() {
            private Map<String, Object> dataFileCache = new HashMap<>();

            @Override
            public Object apply(String relativePath) {
                Path yamlFilePath = Paths.get(getDataDirFullPath(), relativePath + ".yaml");
                if (!Files.exists(yamlFilePath)) {
                    throw new RuntimeException(String.format("Cannot find data file \"%s\".",
                            yamlFilePath.toString()));
                }

                if (dataFileCache.containsKey(relativePath)) {
                    return dataFileCache.get(relativePath);
                } else {
                    try {
                        Yaml yaml = new Yaml();
                        Object dataFileContent = yaml.load(new FileInputStream(yamlFilePath.toString()));
                        dataFileCache.put(relativePath, dataFileContent);
                        return dataFileContent;
                    } catch (FileNotFoundException ex) {
                        // We already confirmed the file exists, so this should never happen
                        throw new RuntimeException(ex);
                    } catch (ParserException ex) {
                        throw new RuntimeException(String.format("Failed to parse data file \"%s\".",
                                yamlFilePath.toString()), ex);
                    }
                }
            }
        });

        // $macroArgs
        this.scriptEngine.put("$macroArgs", new Function<String, Object>() {
            @Override
            public Object apply(String argName) {
                if (actor.macroArgs != null) {
                    return actor.macroArgs.get(argName);
                } else {
                    return null;
                }
            }
        });
        
        // $out
        this.scriptEngine.put("$out", new Function<String, Object>() {
            @Override
            public Object apply(String valueName) {
                if (actor.currentAction != null) {
                    if (actor.currentAction.hasOutput(valueName)) {
                        return actor.currentAction.readOutput(valueName);
                    } else {
                        throw new RuntimeException(String.format("Output value \"%s\" was not found for action %s",
                                valueName,
                                actor.currentAction.getClass().getName()));
                    }
                } else {
                    // This exception should never happen, unless we have a bug
                    throw new RuntimeException("The \"currentAction\" field was not populated for the test actor. This is probably a bug. Please send the log file and all other relevant information to the dev team for investigation");
                }
            }
        });

        // $require
        this.scriptEngine.put("$require", new Function<String, Object>() {
            @Override
            public Object apply(String relativePath) {
                // TODO: Continue implementation
                Path yamlFilePath = Paths.get(getDataDirFullPath(), relativePath + ".yaml");
                if (!Files.exists(yamlFilePath)) {
                    throw new RuntimeException(String.format("Cannot find data file \"%s\".",
                            yamlFilePath.toString()));
                }

                return null;
            }
        });

        // $sharedData
        this.scriptEngine.put("$sharedData", new Function<String, Object>() {
            @Override
            public Object apply(String valueName) {
                String url = String.format("%s/api/session/%s/test/%s/data",
                        syncServiceBaseUrl,
                        testSessionId,
                        currentTestIndex);

                try {
                    HttpRequest request = new HttpRequest(url, HttpVerb.GET);
                    request.execute();
                    Map<String, Object> sharedData = new Gson().fromJson(request.getResponseAsString(), Map.class);
                    return sharedData.get(valueName);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format("There was an error while requesting the test shared data from the sync service. HTTP request details: %s",
                            "GET " + url));
                }
            }
        });
    }

    private MacroDefinition parseMacroDefinition(String macroFullPath) throws Exception {
        if (macroCache.containsKey(macroFullPath)) {
            return macroCache.get(macroFullPath);
        } else {
            Yaml yaml = new Yaml();

            try {
                MacroDefinition def = yaml.loadAs(new FileInputStream(macroFullPath), MacroDefinition.class);
                macroCache.put(macroFullPath, def);
                return def;
            } catch (Exception ex) {
                log.error(String.format("Failed to parse macro definition file \"%s\"", macroFullPath));
                throw ex;
            }
        }
    }

    private TestDefinition parseTestDefinition(String testFullPath) throws Exception {
        Yaml yaml = new Yaml();

        try {
            TestDefinition def = yaml.loadAs(new FileInputStream(testFullPath), TestDefinition.class);
            return def;
        } catch (Exception ex) {
            String message = String.format("Failed to parse test definition file \"%s\"", testFullPath);
            throw new Exception(message, ex);
        }
    }

    /**
     * Waits for the actor to be acquired by a test session and does the work
     * for that one session, then returns.
     *
     * @param maxWaitTime Maximum time this test actor will wait to be acquired
     * by a test session
     * @throws Exception
     */
    @Override
    public void runOneSession(Duration maxWaitTime) throws Exception {
        testSessionId = null;
        Duration waitTime = Duration.ofSeconds(0);

        if (testSessionId == null) {
            log.info(String.format("Actor %s of type %s is waiting to be acquired by a test session%s...",
                    actorId,
                    actorType,
                    maxWaitTime != null
                            ? String.format(" (timeout is %s seconds)", maxWaitTime.getSeconds())
                            : ""));
        }

        // Wait until this actor is acquired by a test session. The testSessionId
        // field is populated in the announce thread.
        while (testSessionId == null) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
            }

            waitTime = waitTime.plus(Duration.ofMillis(1000));
            if (maxWaitTime != null && waitTime.compareTo(maxWaitTime) > 0) {
                log.info(String.format("The maximum wait time of %s seconds was exceeded while waiting for a test session to start",
                        maxWaitTime.getSeconds()));
                return;
            }
        }

        HashMap<String, String> actorLogContext = new HashMap<String, String>();
        actorLogContext.put("actorId", actorId);
        actorLogContext.put("actorType", actorType);
        log = new HttpLogger(syncServiceBaseUrl, testSessionId, actorLogContext);
        log.info(String.format("Actor %s was acquired by test session %s", actorId, testSessionId));

        String testsDirFullPath = getTestsDirFullPath();
        String scriptsDirFullPath = getScriptssDirFullPath();

        initializeScriptEngine();

        // Load JS scripts
        Path libsInitScriptPath = Paths.get(scriptsDirFullPath, "index.js");
        if (Files.exists(libsInitScriptPath)) {
            evalScriptFile(libsInitScriptPath.toString());
        }

        this.currentStepIndex = -1;
        this.currentTestIndex = -1;
        this.macroCache = new HashMap<>();
        this.sessionHasCompleted = false;

        // Start querying the session status and executing the tests
        while (!sessionHasCompleted) {
            SessionStatusResponse sessionStatus = getTestSessionStatus();

            // TODO: If the session status returns null for a longer time, abandon session
            if (sessionStatus != null) {
                if (sessionStatus.status.equals("started")) {
                    // Update the index of the current test for this actor and
                    // load the test configuration
                    if (currentTestIndex < sessionStatus.currentTestIndex) {
                        currentTest = null;
                        currentTestIndex = sessionStatus.currentTestIndex;
                        currentTestPath = sessionStatus.currentTestPath;
                        currentTestName = sessionStatus.currentTestName;
                        currentStepIndex = -1;

                        log.info(String.format("Executing test %s/%s...", currentTestPath, currentTestName));

                        // Identify and parse the test definition file
                        try {
                            String testFullPath = Paths.get(
                                    testsDirFullPath,
                                    currentTestPath,
                                    currentTestName + ".yaml").toString();
                            currentTest = parseTestDefinition(testFullPath);
                            this.scriptEngine.put("$test", currentTest);
                        } catch (Exception ex) {
                            StringWriter sw = new StringWriter();
                            ex.printStackTrace(new PrintWriter(sw));
                            log.error((sw.toString()));

                            // Notify the sync service that step 0 of the test failed
                            HttpRequest stepStatusRequest = new HttpRequest(
                                    String.format("%s/api/session/%s/actor/%s/test/%s/step/%s",
                                            syncServiceBaseUrl,
                                            testSessionId,
                                            actorId,
                                            currentTestIndex,
                                            0),
                                    HttpVerb.PUT);

                            // Start step 0
                            stepStatusRequest.setContent("{\"status\":\"started\",\"result\":\"pending\"}", ContentType.APPLICATION_JSON);
                            stepStatusRequest.execute();

                            // Fail step 0
                            stepStatusRequest.setContent("{\"status\":\"completed\",\"result\":\"failed\"}", ContentType.APPLICATION_JSON);
                            stepStatusRequest.execute();
                        }
                    } else if (currentTestIndex == sessionStatus.currentTestIndex) {
                        // Update the current step index for the actor
                        if (currentStepIndex < sessionStatus.currentStepIndex) {
                            currentStepIndex = sessionStatus.currentStepIndex;
                            currentStepIsCompleted = false;
                        }

                        if (!currentStepIsCompleted && currentStepIndex == sessionStatus.currentStepIndex) {
                            currentStepIsCompleted = true;
                            executeTestStep(sessionStatus.currentStepIndex);
                        }
                    }
                } else if (sessionStatus.status.equals("completed")) {
                    log.info(String.format("Test session %s has completed\n", testSessionId));
                    sessionHasCompleted = true;
                }
            }

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
            }
        }

        testSessionId = null;
    }

    @Override
    public void runOneSession() throws Exception {
        runOneSession(null);
    }

    private void startAnnounceThread() {
        stopAnnounceThread();

        announceThread = new Thread() {
            public void run() {
                try {
                    while (!actorIsStopping) {
                        announce();
                        Thread.sleep(5000);
                    }
                } catch (InterruptedException e) {
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        };

        announceThread.start();
    }

    private void stopAnnounceThread() {
        if (announceThread != null) {
            announceThread.interrupt();
        }
    }

    /**
     * Processes and passes a set of arguments to the specified action object.
     *
     * @param args
     * @param action
     */
    private void writeActionArguments(Map<String, Object> args, TestAction action) {
        if (args == null || action == null) {
            return;
        }

        for (Map.Entry<String, Object> entry : args.entrySet()) {
            try {
                String stringValue = entry.getValue().toString();
                action.writeArgument(entry.getKey(), interpretValue(stringValue));
            } catch (Exception ex) {
                throw new RuntimeException(String.format(
                        "There was an error while processing argument \"%s\"",
                        entry.getKey()), ex);
            }
        }
    }
}

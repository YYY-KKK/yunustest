package dtest.base;

import com.google.gson.JsonObject;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequest;
import dtest.base.http.HttpVerb;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map.Entry;
import dtest.base.contracts.ILogger;

/**
 * Utility class to create log entries using the sync service HTTP API
 */
public class HttpLogger implements ILogger {
	enum LogLevel { ERROR, INFO, WARNING }
	
	private HashMap<String, String> context;
	
	private String syncServiceBaseUrl;
	
	private String testSessionId;
	
	public HttpLogger(String syncServiceBaseUrl, String testSessionId, HashMap<String, String> context) {
		this.context = context;
		this.syncServiceBaseUrl = syncServiceBaseUrl;
		this.testSessionId = testSessionId;
	}
	
	private void createLogEntry(LogLevel level, String text) {
		System.out.println(text);
		
		HttpRequest request = new HttpRequest(
			String.format("%s/api/session/%s/log",
				syncServiceBaseUrl,
				testSessionId),
			HttpVerb.POST);
		
		JsonObject json = new JsonObject();
		json.addProperty("message", text);
		
		if (context != null) {
			JsonObject extras = new JsonObject();
			Iterator<Entry<String, String>> it = context.entrySet().iterator();
		    while (it.hasNext()) {
		        Entry<String, String> pair = it.next();
		        extras.addProperty(pair.getKey(), pair.getValue());
		    }
		    json.add("extras", extras);
		}
		request.setContent(json.toString(), ContentType.APPLICATION_JSON);
		request.execute();
	}
	
	public void error(String text) {
		createLogEntry(LogLevel.ERROR, "ERROR: " + text);
	}

	public void info(String text) {
		createLogEntry(LogLevel.INFO, text);
	}

	public void warning(String text) {
		createLogEntry(LogLevel.WARNING, "WARNING: " + text);
	}
}

package dtest.actor;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dtest.base.contracts.ISharedData;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequest;
import dtest.base.http.HttpVerb;
import java.io.IOException;

public class SharedData implements ISharedData {
	enum LogLevel { ERROR, INFO, WARNING }
	
	private String syncServiceBaseUrl;
	
	private String testSessionId;
	
	private int testIndex;
	
	public SharedData(String syncServiceBaseUrl, String testSessionId, int testIndex) {
		this.syncServiceBaseUrl = syncServiceBaseUrl;
		this.testSessionId = testSessionId;
		this.testIndex = testIndex;
	}

	public String get(String propertyName) throws Exception {
		HttpRequest request = new HttpRequest(
			String.format("%s/api/session/%s/test/%d/data",
				syncServiceBaseUrl,
				testSessionId,
				testIndex),
			HttpVerb.GET);
		
		request.execute();
		
		JsonElement jelement;
		
		try {
			jelement = new JsonParser().parse(request.getResponseAsString());
		} catch (Exception e) {
			return null;
		}
	    JsonObject  jobject = jelement.getAsJsonObject();
		return jobject.get(propertyName).getAsString();
	}

	public void set(String propertyName, String propertyValue) throws IOException {
		HttpRequest request = new HttpRequest(
			String.format("%s/api/session/%s/test/%d/data",
				syncServiceBaseUrl,
				testSessionId,
				testIndex),
			HttpVerb.PUT);
		
		JsonObject json = new JsonObject();
		json.addProperty(propertyName, propertyValue);
		request.setContent(json.toString(), ContentType.APPLICATION_JSON);
		
		request.execute();
	}
}

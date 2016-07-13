package com.mcdonalds.dtest.actor;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mcdonalds.dtest.actor.http.ContentType;
import com.mcdonalds.dtest.actor.http.HttpRequest;
import com.mcdonalds.dtest.actor.http.HttpVerb;
import com.mcdonalds.dtest.contracts.ISharedData;

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

	public String get(String propertyName) {
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

	public void set(String propertyName, String propertyValue) {
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

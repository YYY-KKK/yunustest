package dtest.http;

import java.io.*;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpEntity;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.*;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.*;

import dtest.http.ContentType;

public class HttpRequest {
	private CloseableHttpClient httpClient;
	
	private HttpRequestBase httpRequest;
	
	private HttpEntity responseEntity;
	
	public HttpRequest(String uri, HttpVerb verb) {
		RequestConfig requestConfig = RequestConfig.custom()
				.setCookieSpec(CookieSpecs.STANDARD).build();
		
		httpClient = HttpClientBuilder.create()
			    .disableRedirectHandling()
			    .setDefaultRequestConfig(requestConfig)
			    .build();
		
		switch (verb) {
			case GET: httpRequest = new HttpGet(uri); break;
			case POST: httpRequest = new HttpPost(uri); break;
			case PUT: httpRequest = new HttpPut(uri); break;
			case DELETE: httpRequest = new HttpDelete(uri); break;
		}
	}
	
	public void setHeader(String headerName, String headerValue) {}
	
	public void setContent(String content, ContentType contentType) {
		if (HttpEntityEnclosingRequestBase.class.isInstance(httpRequest)) {
			org.apache.http.entity.ContentType apacheContentType = null;
			
			switch (contentType) {
				case APPLICATION_JSON:
					apacheContentType = org.apache.http.entity.ContentType.APPLICATION_JSON;
					break;
				case TEXT_PLAIN:
					apacheContentType = org.apache.http.entity.ContentType.TEXT_PLAIN;
					break;
			}
			
			StringEntity requestEntity = new StringEntity(
				content,
				apacheContentType);
			
			((HttpEntityEnclosingRequestBase)httpRequest).setEntity(requestEntity);
		}
	}
	
	public void execute() {
		CloseableHttpResponse response;
		
		try {
			response = httpClient.execute(httpRequest);
			responseEntity = response.getEntity();
		} catch (ClientProtocolException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public String getResponseAsString() throws UnsupportedOperationException, IOException {
		return IOUtils.toString(responseEntity.getContent(), "UTF-8");
	}
}

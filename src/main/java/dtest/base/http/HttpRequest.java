package dtest.base.http;

import java.io.*;
import java.util.HashMap;
import java.util.Map;
import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.*;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.*;

public class HttpRequest {

    private CloseableHttpClient httpClient;

    private HttpRequestBase httpRequest;

    private HttpResponse response;

    private String uri;

    private HttpVerb httpVerb;

    public HttpRequest(String uri, HttpVerb verb) {
        this.uri = uri;
        this.httpVerb = verb;

        RequestConfig requestConfig = RequestConfig.custom()
                .setCookieSpec(CookieSpecs.STANDARD).build();

        httpClient = HttpClientBuilder.create()
                .disableRedirectHandling()
                .setDefaultRequestConfig(requestConfig)
                .build();

        switch (verb) {
            case GET:
                httpRequest = new HttpGet(uri);
                break;
            case POST:
                httpRequest = new HttpPost(uri);
                break;
            case PUT:
                httpRequest = new HttpPut(uri);
                break;
            case DELETE:
                httpRequest = new HttpDelete(uri);
                break;
        }
    }

    public void setHeader(String headerName, String headerValue) {
    }

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

            ((HttpEntityEnclosingRequestBase) httpRequest).setEntity(requestEntity);
        }
    }

    // TODO: Take a timeout value and throw an exception in case the HTTP server doesn't respond in due time
    public void execute() throws IOException {
        this.response = httpClient.execute(httpRequest);
    }

    public HttpVerb getHttpVerb() {
        return this.httpVerb;
    }

    public String getResponseAsString() {
        HttpEntity responseEntity = this.response.getEntity();
                
        if (responseEntity != null) {
            try {
                return IOUtils.toString(responseEntity.getContent(), "UTF-8");
            } catch (Exception ex) {
                throw new RuntimeException(String.format("Failed to get the response content for HTTP request %s %s",
                    this.httpVerb,
                    this.uri), ex);
            }
        } else {
            throw new RuntimeException(String.format("Failed to get a response for HTTP request %s %s",
                    this.httpVerb,
                    this.uri));
        }
    }

    public Map<String, String> getResponseHeaders() {
        Header[] headers = this.response.getAllHeaders();
        Map<String, String> headersMap = new HashMap<String, String>();
        for (Header header : headers) {
            headersMap.put(header.getName(), header.getValue());
        }
        return headersMap;
    }
    
    public Integer getResponseStatusCode() {
        return this.response.getStatusLine().getStatusCode();
    }

    public InputStream getResponseAsStream() throws IOException {
        return this.response.getEntity().getContent();
    }

    public String getUri() {
        return this.uri;
    }
}

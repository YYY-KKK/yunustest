package dtest.base.http;

import java.io.*;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpEntity;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.*;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.*;

public class HttpRequest {

    private CloseableHttpClient httpClient;

    private HttpRequestBase httpRequest;

    private HttpEntity responseEntity;

    private Integer responseStatusCode;

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
    public void execute() throws IOException  {
        CloseableHttpResponse response = httpClient.execute(httpRequest);
        responseStatusCode = response.getStatusLine().getStatusCode();
        responseEntity = response.getEntity();
    }

    public HttpVerb getHttpVerb() {
        return this.httpVerb;
    }

    public String getResponseAsString() throws UnsupportedOperationException, IOException {
        if (responseEntity != null) {
            return IOUtils.toString(responseEntity.getContent(), "UTF-8");
        } else {
            throw new RuntimeException(String.format("Failed to get a response for HTTP request %s %s",
                    this.httpVerb,
                    this.uri));
        }
    }

    public Integer getResponseStatusCode() {
        return responseStatusCode;
    }

    public InputStream getResponseAsStream() throws IOException {
        return responseEntity.getContent();
    }

    public String getUri() {
        return this.uri;
    }
}

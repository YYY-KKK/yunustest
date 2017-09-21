package dtest.base.http;

import java.io.*;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHost;
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

        org.apache.log4j.Logger.getLogger(CloseableHttpClient.class).setLevel(org.apache.log4j.Level.ERROR);

        RequestConfig requestConfig = RequestConfig.custom()
                .setCookieSpec(CookieSpecs.STANDARD)
                .build();

        this.httpClient = HttpClientBuilder.create()
                .disableRedirectHandling()
                .setDefaultRequestConfig(requestConfig)
                .build();

        switch (verb) {
            case GET:
                this.httpRequest = new HttpGet(uri);
                break;
            case HEAD:
                this.httpRequest = new HttpHead(uri);
                break;
            case OPTIONS:
                this.httpRequest = new HttpOptions(uri);
                break;
            case PATCH:
                this.httpRequest = new HttpPatch(uri);
                break;
            case POST:
                this.httpRequest = new HttpPost(uri);
                break;
            case PUT:
                this.httpRequest = new HttpPut(uri);
                break;
            case DELETE:
                this.httpRequest = new HttpDelete(uri);
                break;
            case DELETE_WITH_BODY:
                this.httpRequest = new HttpDeleteWithBody(uri);
                break;
            default:
                throw new RuntimeException(String.format("HTTP verb \"%s\" is not supported", verb));
        }
    }

    public HttpRequest(String uri, HttpVerb verb, String proxyServer) {
        this(uri, verb);

        if (proxyServer != null && !proxyServer.trim().isEmpty()) {
            this.setProxy(proxyServer);
        }
    }

    // TODO: Take a timeout value and throw an exception in case the HTTP server doesn't respond in due time
    public void execute() throws IOException {
        this.response = this.httpClient.execute(httpRequest);
    }

    public HttpVerb getHttpVerb() {
        return this.httpVerb;
    }

    public String getResponseAsString() {
        HttpEntity responseEntity = this.response.getEntity();

        if (responseEntity != null) {
            try {
                InputStream contentStream = responseEntity.getContent();

                if (contentStream != null) {
                    return IOUtils.toString(contentStream, "UTF-8");
                } else {
                    return "";
                }
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

    public int getResponseStatusCode() {
        return this.response.getStatusLine().getStatusCode();
    }

    public InputStream getResponseAsStream() throws IOException {
        return this.response.getEntity().getContent();
    }

    public String getUri() {
        return this.uri;
    }

    public String getFirstHeader(String headerName) {
        Header header = this.response.getFirstHeader(headerName);
        return header != null ? header.getValue() : null;
    }

    public void setContent(String content, String contentType) {
        if (content == null) {
            content = "";
        }

        //TODO: Improve the validation logic
        if (contentType.indexOf('/') <= 0) {
            throw new RuntimeException(String.format("Content type \"%s\" is not a valid MIME type", contentType));
        }

        if (HttpEntityEnclosingRequestBase.class.isInstance(httpRequest)) {
            try {
                StringEntity requestEntity = new StringEntity(content);
                ((HttpEntityEnclosingRequestBase) this.httpRequest).setEntity(requestEntity);
                this.httpRequest.setHeader("Content-Type", contentType);
            } catch (Exception ex) {
                throw new RuntimeException("Failed to set HTTP request content", ex);
            }
        }
    }

    public void setHeader(String headerName, String headerValue) {
        this.httpRequest.setHeader(headerName, headerValue);
    }

    public void setProxy(String proxyServer) {
        String proxy = null;
        String proxyPort = null;
        Pattern pattern = Pattern.compile("(?<proxy>.+?)(:(?<port>.+))?");
        Matcher matcher = pattern.matcher(proxyServer.trim());
        if (matcher.matches()) {
            proxy = matcher.group("proxy");
            proxyPort = matcher.group("port");
        } else {
            throw new RuntimeException(String.format("Invalid proxy server:", proxyServer));
        }

        HttpHost proxyHost;
        if (proxyPort != null) {
            proxyHost = new HttpHost(proxy, Integer.valueOf(proxyPort));
        } else {
            proxyHost = new HttpHost(proxy);
        }
        RequestConfig oldConfig = this.httpRequest.getConfig();
        RequestConfig.Builder configBuilder = null;

        if (oldConfig != null) {
            configBuilder = RequestConfig.copy(oldConfig);
        } else {
            configBuilder = RequestConfig.custom().setProxy(proxyHost);
        }

        this.httpRequest.setConfig(configBuilder.build());
    }
}

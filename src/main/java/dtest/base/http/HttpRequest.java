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
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.*;
import org.apache.http.ssl.SSLContextBuilder;

public class HttpRequest {

    private CloseableHttpClient httpClient;

    private HttpRequestBase httpRequest;

    private HttpResponse response;

    private String url;

    private HttpVerb httpVerb;

    public HttpRequest(HttpRequestOptions options) {
        if (options.proxy != null && !options.proxy.trim().isEmpty()) {
            this.setProxy(options.proxy);
        }

        this.url = options.url;
        this.httpVerb = options.httpVerb;

        // Avoid outputing anoying log entries in the console
        org.apache.log4j.Logger.getLogger(CloseableHttpClient.class).setLevel(org.apache.log4j.Level.ERROR);

        this.httpClient = createHttpClient(options.ignoreCert);

        switch (this.httpVerb) {
            case GET:
                this.httpRequest = new HttpGet(url);
                break;
            case HEAD:
                this.httpRequest = new HttpHead(url);
                break;
            case OPTIONS:
                this.httpRequest = new HttpOptions(url);
                break;
            case PATCH:
                this.httpRequest = new HttpPatch(url);
                break;
            case POST:
                this.httpRequest = new HttpPost(url);
                break;
            case PUT:
                this.httpRequest = new HttpPut(url);
                break;
            case DELETE:
                this.httpRequest = new HttpDelete(url);
                break;
            case DELETE_WITH_BODY:
                this.httpRequest = new HttpDeleteWithBody(url);
                break;
            default:
                throw new RuntimeException(String.format("HTTP verb \"%s\" is not supported", this.httpVerb));
        }
    }

    private CloseableHttpClient createHttpClient(boolean ignoreCert) {
        try {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setCookieSpec(CookieSpecs.STANDARD)
                    .build();

            CloseableHttpClient client;

            if (ignoreCert) {
                SSLContextBuilder builder = new SSLContextBuilder();
                builder.loadTrustMaterial(null, new TrustSelfSignedStrategy());
                SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(
                        builder.build());
                client = HttpClients.custom()
                        .disableRedirectHandling()
                        .setDefaultRequestConfig(requestConfig)
                        .setSSLSocketFactory(sslsf)
                        .build();
            } else {
                client = HttpClientBuilder.create()
                        .disableRedirectHandling()
                        .setDefaultRequestConfig(requestConfig)
                        .build();
            }

            return client;
        } catch (Throwable ex) {
            throw new RuntimeException(String.format(
                    "Failed to create http client (ignoreCert = %s)",
                    ignoreCert), ex);
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
                        this.url), ex);
            }
        } else {
            throw new RuntimeException(String.format("Failed to get a response for HTTP request %s %s",
                    this.httpVerb,
                    this.url));
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
        return this.url;
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

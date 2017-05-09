package dtest.actions;

import dtest.base.TestAction;
import dtest.base.http.ContentType;
import dtest.base.http.HttpVerb;
import java.util.HashMap;
import java.util.Map;

/**
 * An action that performs an HTTP request.
 */
public class HttpRequest extends TestAction {

    @Override
    public void run() {
        super.run();

        String url = readStringArgument("url");
        String httpVerb = readStringArgument("verb", "GET");
        Map<String, Object> headers = readMapArgument("headers", new HashMap<String, Object>());
        String body = readStringArgument("body", "");
        String contentType = readStringArgument("contentType", ContentType.TEXT_PLAIN);
        Integer successStatusCode = null;
        if (this.hasArgument("successStatusCode")) {
            successStatusCode = readIntArgument("successStatusCode");
        }

        dtest.base.http.HttpRequest httpRequest = new dtest.base.http.HttpRequest(url, HttpVerb.valueOf(httpVerb));
        httpRequest.setContent(body, contentType);
        headers.forEach((headerName, headerValue) -> {
            httpRequest.setHeader(headerName, headerValue.toString());
        });

        int durationMs = 0;
        
        try {
            long startTime = System.nanoTime();
            httpRequest.execute();
            long endTime = System.nanoTime();
            durationMs = (int)((endTime - startTime)/1e6);
            
        } catch (Exception ex) {
            throw new RuntimeException("Failed to send HTTP request", ex);
        }

        int responseStatusCode = httpRequest.getResponseStatusCode();

        if (successStatusCode == null && responseStatusCode != 200) {
            throw new RuntimeException(String.format(
                    "The HTTP request returned status code %s. If this is the expected status code, please specify it in the \"successStatusCode\" argument of the HttpRequest action, otherwise we expect to receive status code 200. The response body was: %s",
                    responseStatusCode,
                    httpRequest.getResponseAsString()));
        } else if (successStatusCode != null && successStatusCode != responseStatusCode) {
            throw new RuntimeException(String.format(
                    "The HTTP request returned status code %s, but we expected %s. The response body was: %s",
                    responseStatusCode,
                    successStatusCode,
                    httpRequest.getResponseAsString()));
        }

        this.writeOutput("durationMs", durationMs);
        this.writeOutput("headers", httpRequest.getResponseHeaders());
        this.writeOutput("statusCode", String.valueOf(responseStatusCode));
        this.writeOutput("body", httpRequest.getResponseAsString());
    }
}

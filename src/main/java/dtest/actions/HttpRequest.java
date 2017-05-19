package dtest.actions;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dtest.base.TestAction;
import dtest.base.http.ContentType;
import dtest.base.http.HttpVerb;
import dtest.base.logging.Logger;
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
            durationMs = (int) ((endTime - startTime) / 1e6);

        } catch (Exception ex) {
            throw new RuntimeException("Failed to send HTTP request", ex);
        }

        int responseStatusCode = httpRequest.getResponseStatusCode();
        String responseString = httpRequest.getResponseAsString();

        // Log response details, whether the request was successful or not
        Map<String, Object> responseDetails = new HashMap<>();
        responseDetails.put("statusCode", responseStatusCode);
        responseDetails.put("durationMs", durationMs);
        responseDetails.put("headers", httpRequest.getResponseHeaders());
        responseDetails.put("body", responseString);
        Logger.trace(String.format("HTTP response details: %s", responseDetails));

        // Check status code, if a success code was specified
        if (successStatusCode != null && !successStatusCode.equals(responseStatusCode)) {
            throw new RuntimeException(String.format(
                    "The HTTP request returned status code %s, but we expected %s.\n\tThe response body was: %s\n\tThe response headers were: %s",
                    responseStatusCode,
                    successStatusCode,
                    httpRequest.getResponseAsString(),
                    httpRequest.getResponseHeaders()));
        }

        this.writeOutput("durationMs", durationMs);
        this.writeOutput("statusCode", responseStatusCode);

        Map<String, String> responseHeaders = httpRequest.getResponseHeaders();
        this.writeOutput("headers", responseHeaders);

        // If the content type is JSON, store the output value as object, so scripts
        // can work with it using dot notation. Otherwise st ore it as string.
        String contentTypeHeader = httpRequest.getFirstHeader("Content-Type").toLowerCase();
        if (contentTypeHeader != null && contentTypeHeader.contains("application/json")) {
            Gson gson = new GsonBuilder().create();
            Object responseBody = gson.fromJson(responseString, Object.class);
            this.writeOutput("body", responseBody);
        } else {
            this.writeOutput("body", responseString);
        }
    }
}

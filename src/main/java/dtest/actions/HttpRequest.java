package dtest.actions;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dtest.annotations.TestActionArgument;
import dtest.annotations.TestActionClass;
import dtest.annotations.TestArgumentType;
import dtest.base.TestAction;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequestOptions;
import dtest.base.http.HttpVerb;
import dtest.base.logging.Logger;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.apache.commons.io.IOUtils;

@TestActionClass(description = "Performs an HTTP request.")
@TestActionArgument(name = "url", type = TestArgumentType.STRING, optional = false, description = "Request URL.")
@TestActionArgument(name = "verb", type = TestArgumentType.STRING, optional = true, description = "HTTP verb (GET, POST, PUT, DELETE, etc.). Default: GET.")
@TestActionArgument(name = "headers", type = TestArgumentType.MAP, optional = true, description = "HTTP headers.")
@TestActionArgument(name = "body", type = TestArgumentType.STRING, optional = true, description = "HTTP request payload.")
@TestActionArgument(name = "contentType", type = TestArgumentType.STRING, optional = true, description = "The content type of the payload. This value will be used as the Content-Type HTTP header. Default: text/plain.")
@TestActionArgument(name = "outputFile", type = TestArgumentType.STRING, optional = true, description = "The file that the response body will be written to. This is particularly useful for downloading files.")
@TestActionArgument(name = "ignoreCert", type = TestArgumentType.BOOLEAN, optional = false, description = "Allows the HTTP client to ignore the web server certificate. Useful for working with self-signed certificates. Default: false.")
@TestActionArgument(name = "proxy", type = TestArgumentType.STRING, optional = true, description = "HTTP proxy server. Both the server name and IP and port number can be specified, separated by \":\" (e.g. 10.0.0.1:8888).")
@TestActionArgument(name = "successStatusCode", type = TestArgumentType.STRING, optional = true, description = "The HTTP status code that is expected in the response. The action will fail if a different status code is received in the response.")

/**
 * Performs an HTTP request.
 */
public class HttpRequest extends TestAction {

    @Override
    public void run() {
        super.run();

        String url = this.readStringArgument("url");
        HttpVerb httpVerb = HttpVerb.valueOf(this.readStringArgument("verb", "GET"));
        Map<String, Object> headers = this.readMapArgument("headers", new HashMap<String, Object>());
        String body = this.readStringArgument("body", null);
        String contentType = this.readStringArgument("contentType", ContentType.TEXT_PLAIN);
        String outputFilePath = this.readStringArgument("outputFile", null);
        Boolean ignoreCert = this.readBooleanArgument("ignoreCert", false);
        String proxy = this.readStringArgument("proxy", null);
        Integer successStatusCode = this.readIntArgument("successStatusCode", null);

        if (httpVerb == HttpVerb.DELETE && body != null) {
            httpVerb = HttpVerb.DELETE_WITH_BODY;
        }

        HttpRequestOptions options = new HttpRequestOptions(url, httpVerb);
        options.proxy = proxy;
        options.ignoreCert = ignoreCert;
        dtest.base.http.HttpRequest httpRequest = new dtest.base.http.HttpRequest(options);
        if (body != null) {
            httpRequest.setContent(body, contentType);
        }
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
            throw new RuntimeException("HTTP request failed", ex);
        }

        String responseString = "N/A";
        String responseStringTruncated = "N/A";

        if (outputFilePath == null) {
            responseString = httpRequest.getResponseAsString();
            responseStringTruncated = responseString;
            int maxLogEntryLength = 50000;
            if (responseStringTruncated.length() > maxLogEntryLength) {
                responseStringTruncated = responseStringTruncated.substring(0, maxLogEntryLength + 1)
                        + " [RESPONSE WAS TRUNCATED]";
            }
        } else {
            try {
                responseString = responseStringTruncated = "[RESPONSE PAYLOAD WAS SAVED INTO OUTPUT FILE]";
                InputStream responseInputStream = httpRequest.getResponseAsStream();
                File outputFile = new File(outputFilePath);
                outputFile.createNewFile();
                FileOutputStream outputFileStream = new FileOutputStream(outputFile);
                IOUtils.copy(responseInputStream, outputFileStream);
                responseInputStream.close();
                outputFileStream.close();
            } catch (Throwable ex) {
                throw new RuntimeException(String.format(
                        "Failed to save response payload into file \"%s\"",
                        outputFilePath), ex);
            }
        }

        int responseStatusCode = httpRequest.getResponseStatusCode();

        // Log response details, whether the request was successful or not
        Map<String, Object> responseDetails = new HashMap<>();
        responseDetails.put("statusCode", responseStatusCode);
        responseDetails.put("durationMs", durationMs);
        responseDetails.put("headers", httpRequest.getResponseHeaders());
        responseDetails.put("body", responseStringTruncated);
        Logger.trace(String.format("HTTP response details: %s", responseDetails));

        // Check status code, if a success code was specified
        if (successStatusCode != null && !successStatusCode.equals(responseStatusCode)) {
            throw new RuntimeException(String.format(
                    "The HTTP request returned status code %s, but we expected %s.\n\tThe response body was: %s\n\tThe response headers were: %s",
                    responseStatusCode,
                    successStatusCode,
                    responseStringTruncated,
                    httpRequest.getResponseHeaders()));
        }

        Logger.debug(String.format(
                "The HTTP request returned status code %s.\n\tThe response body was: %s\n\tThe response headers were: %s",
                responseStatusCode,
                responseStringTruncated,
                httpRequest.getResponseHeaders()));

        this.writeOutput("durationMs", durationMs);
        this.writeOutput("statusCode", responseStatusCode);

        Map<String, String> responseHeaders = httpRequest.getResponseHeaders();
        this.writeOutput("headers", responseHeaders);

        // If the content type is JSON, store the output value as object, so scripts
        // can work with it using dot notation. Otherwise st ore it as string.
        String contentTypeHeader = httpRequest.getFirstHeader("Content-Type");
        if (contentTypeHeader != null) {
            contentTypeHeader = contentTypeHeader.toLowerCase();
        }

        if (contentTypeHeader != null && contentTypeHeader.contains("application/json")) {
            // If we're dealing with JSON content, we parse it into an object so
            // it's esier to consume in the test definition file
            Gson gson = new GsonBuilder().create();
            Object responseBody = gson.fromJson(responseString, Object.class);
            this.writeOutput("body", responseBody);
        } else {
            this.writeOutput("body", responseString);
        }
    }
}

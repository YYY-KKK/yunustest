package dtest.base.logging;

import com.google.gson.JsonObject;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequest;
import dtest.base.http.HttpRequestOptions;
import dtest.base.http.HttpVerb;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map.Entry;

/**
 * Utility class to create log entries using the sync service HTTP API
 */
public class HttpLogger extends BaseLogger {

    private HashMap<String, String> context;

    private String httpProxy;

    private String syncServiceBaseUrl;

    private String testSessionId;

    public HttpLogger(String syncServiceBaseUrl, String testSessionId, HashMap<String, String> context) {
        this.context = context;
        this.httpProxy = null;
        this.syncServiceBaseUrl = syncServiceBaseUrl;
        this.testSessionId = testSessionId;
    }

    public HttpLogger(String syncServiceBaseUrl, String testSessionId, HashMap<String, String> context, String httpProxy) {
        this(syncServiceBaseUrl, testSessionId, context);
        this.httpProxy = httpProxy;
    }

    @Override
    protected void writeLogEntry(String text, LogLevel level) {
        // Also write the message to console
        if (text != null && !text.isEmpty()) {
            String timeOfLogEntry = new SimpleDateFormat("HH:mm:ss").format(new Date());
            String message = String.format("%s %s%s", timeOfLogEntry, getPrefixForLevel(level), text);

            if (level == LogLevel.ERROR) {
                System.err.println(message);
            } else {
                System.out.println(message);
            }
        } else {
            System.out.println();
        }

        HttpRequestOptions options = new HttpRequestOptions(
                String.format("%s/api/session/%s/log",
                        this.syncServiceBaseUrl,
                        this.testSessionId),
                HttpVerb.POST);
        options.proxy = this.httpProxy;
        HttpRequest request = new HttpRequest(options);

        JsonObject json = new JsonObject();
        json.addProperty("message", getPrefixForLevel(level) + text);

        if (this.context != null) {
            JsonObject extras = new JsonObject();
            Iterator<Entry<String, String>> it = this.context.entrySet().iterator();
            while (it.hasNext()) {
                Entry<String, String> pair = it.next();
                extras.addProperty(pair.getKey(), pair.getValue());
            }
            json.add("extras", extras);
        }
        request.setContent(json.toString(), ContentType.APPLICATION_JSON);
        try {
            request.execute();
        } catch (IOException ex) {
            Logger.error("Failed sending log entry to the sync service", ex);
        }
    }
}

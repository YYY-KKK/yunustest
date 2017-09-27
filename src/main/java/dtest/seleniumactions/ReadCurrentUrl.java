package dtest.seleniumactions;

import java.net.URL;

public class ReadCurrentUrl extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        try {
            String urlValue = driver.getCurrentUrl();
            URL currentUrl = new URL(urlValue);
            
            this.writeOutput("anchor", currentUrl.getRef());
            this.writeOutput("authority", currentUrl.getAuthority());
            this.writeOutput("defaultPort", currentUrl.getDefaultPort());
            this.writeOutput("file", currentUrl.getFile());
            this.writeOutput("host", currentUrl.getHost());
            this.writeOutput("path", currentUrl.getPath());
            int port = currentUrl.getPort();
            this.writeOutput("port", port > 0 ? port : null);
            this.writeOutput("protocol", currentUrl.getProtocol());
            this.writeOutput("query", currentUrl.getQuery());
            this.writeOutput("userInfo", currentUrl.getUserInfo());
            this.writeOutput("value", urlValue);
        } catch (Throwable ex) {
            throw new RuntimeException("Failed reading the current URL", ex);
        }
    }
}

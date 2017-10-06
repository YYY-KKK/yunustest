package dtest.seleniumactions;

import dtest.base.logging.Logger;
import dtest.base.util.Config;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.ie.InternetExplorerDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.safari.SafariDriver;

public class SeleniumHelper {

    private WebDriver driver;

    private Config config;

    private static SeleniumHelper instance;

    private SeleniumHelper() {
        this.config = Config.load("actor.yaml");
    }

    private WebDriver createDriver() {
        WebDriver webDriver = null;
        DesiredCapabilities caps;
        String browserName = config.getString("selenium.desiredCapabilities.browserName").toLowerCase();

        setSystemProperties();

        switch (browserName) {
            case "chrome":
                caps = DesiredCapabilities.chrome();
                injectConfigCapabilities(caps);
                webDriver = new ChromeDriver(caps);
                break;
            case "edge":
                caps = DesiredCapabilities.edge();
                injectConfigCapabilities(caps);
                webDriver = new EdgeDriver(caps);
                break;
            case "firefox":
                caps = DesiredCapabilities.firefox();
                injectConfigCapabilities(caps);
                webDriver = new FirefoxDriver(caps);
                break;
            case "internet explorer":
                caps = DesiredCapabilities.internetExplorer();
                injectConfigCapabilities(caps);
                webDriver = new InternetExplorerDriver(caps);
                break;
            case "safari":
                caps = DesiredCapabilities.safari();
                injectConfigCapabilities(caps);
                webDriver = new SafariDriver();
                break;
            default:
                throw new RuntimeException(String.format(
                        "The \"selenium.browserName\" config property specifies a browser "
                        + "that is invalid or not supported. The property value was \"%s\"",
                        browserName));
        }

        Integer scriptTimeout = Integer.valueOf(config.getString("selenium.scriptTimeout", "20"));
        webDriver.manage().timeouts().setScriptTimeout(scriptTimeout, TimeUnit.SECONDS);
        webDriver.manage().timeouts().implicitlyWait(5, TimeUnit.SECONDS);
        Boolean maximizeWindow = config.getString("selenium.maximizeWindow").equalsIgnoreCase("true");
        if (maximizeWindow) {
            webDriver.manage().window().maximize();
        }

        return webDriver;
    }

    public WebDriver getDriver() {
        if (driver == null) {
            driver = createDriver();
        }

        return driver;
    }

    public static SeleniumHelper getInstance() {
        if (instance == null) {
            instance = new SeleniumHelper();
        }

        return instance;
    }

    /**
     * Inject desired capabilities from configuration into the specified object.
     */
    private void injectConfigCapabilities(DesiredCapabilities capabilities) {
        Object caps = config.get("selenium.desiredCapabilities");

        if (caps instanceof Map) {
            Map<String, Object> capsAsMap = (Map) caps;
            for (Map.Entry entry : capsAsMap.entrySet()) {
                if (entry.getValue() != null) {
                    capabilities.setCapability(entry.getKey().toString(), entry.getValue());
                }
            }
        }
    }

    /**
     * Calls driver.quit() and sets the driver instance to null.
     */
    public void discardDriver() {
        if (driver != null) {
            try {
                driver.quit();
            } catch (Exception ex) {
                Logger.warning("Failed to quit the Selenium driver", ex);
            }
            
            driver = null;
        }
    }

    /**
     * Set the system properties as specified in configuration property
     * "selenium.systemProperties".
     */
    private void setSystemProperties() {
        Object systemProperties = config.get("selenium.systemProperties");

        if (systemProperties instanceof Map) {
            Map<String, Object> propsAsMap = (Map) systemProperties;
            for (Map.Entry entry : propsAsMap.entrySet()) {
                if (entry.getValue() != null) {
                    System.setProperty(entry.getKey().toString(), entry.getValue().toString());
                }
            }
        }
    }

    /**
     * Check the connection with the driver and perform a simple operation to
     * ensure it works properly. Discard the driver instance and create a new
     * one, if necessary.
     */
    public void verifyDriverIsValid() {
        int retriesLeft = 3;

        while (retriesLeft > 0) {
            retriesLeft--;

            try {
                if (driver == null) {
                    driver = createDriver();
                }
                Dimension d = driver.manage().window().getSize();
                break;
            } catch (Throwable ex) {
                this.discardDriver();

                Logger.info(String.format("Caught exception %s while initializing the Selenium driver. The exception message was: \"%s\". Retries left: %s.",
                        ex.getClass().getName(),
                        ex.getMessage(),
                        retriesLeft));
            }
        }
    }
}

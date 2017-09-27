package dtest.seleniumactions;

import dtest.base.TestActorEvents;
import dtest.base.contracts.ITestActor;
import dtest.base.util.Config;
import java.util.Map;
import java.util.Observable;
import java.util.Observer;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.ie.InternetExplorerDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.safari.SafariDriver;

public class SeleniumHelper implements Observer {

    private WebDriver driver;

    private Config config;

    private static SeleniumHelper instance;

    private SeleniumHelper() {
        this.config = Config.load("actor.yaml");
    }

    public WebDriver createDriver() {
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

    public void resetDriver() {
        driver.quit();
        driver = null;
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

    @Override
    public void update(Observable eventSource, Object eventData) {
        if (eventSource instanceof ITestActor) {
            if (eventData == TestActorEvents.SESSION_COMPLETED) {
                resetDriver();
            }
        }
    }
}

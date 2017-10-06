package dtest.seleniumactions;

import com.paulhammant.ngwebdriver.NgWebDriver;
import dtest.base.TestAction;
import dtest.base.TestActorEvents;
import dtest.base.contracts.ITestActor;
import dtest.base.logging.Logger;
import dtest.base.util.Config;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.Observable;
import java.util.Observer;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * This is the base class that all Web UI test actions must inherit from.
 */
public abstract class WebTestAction extends TestAction {

    // Used for implementing the Selenium API for emulating
    // complex user gestures
    protected static Actions actions;

    protected static Config config;

    protected static boolean initialized;

    // Stores a reference to the Selenium WebDriver object
    // used for automation.
    protected WebDriver driver;

    /**
     * Locates and returns a UI element.
     */
    protected WebElement getElement(By locator) {
        return getElement(locator, 10);
    }

    /**
     * Locates and returns a UI element.
     */
    protected WebElement getElement(By locator, int timeoutSec) {
        // Don't wait for more than 10 minutes
        timeoutSec = Math.min(timeoutSec, 600);

        long startTime = System.currentTimeMillis();

        while (true) {
            try {
                return driver.findElement(locator);
            } catch (Exception exc) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ex) {
                }

                if ((System.currentTimeMillis() - startTime) > timeoutSec * 1000) {
                    throw exc;
                }
            }
        }
    }

    @Override
    public void initialize() {
        super.initialize();

        try {
            if (!WebTestAction.initialized) {
                WebTestAction.initialized = true;
                WebTestAction.config = Config.load("actor.yaml");

                this.getActor().addObserver(new Observer() {
                    @Override
                    public void update(Observable eventSource, Object eventData) {
                        if (eventSource instanceof ITestActor) {
                            if (eventData == TestActorEvents.TEST_COMPLETED) {
                                SeleniumHelper.getInstance().discardDriver();
                            }
                        }
                    }
                });
            }
        } catch (Exception ex) {
            Logger.warning("Could not find config file \"actor.yaml\"");
            WebTestAction.config = new Config();
        }

        this.driver = SeleniumHelper.getInstance().getDriver();
    }

    @Override
    public void run() {
        super.run();
    }

    /**
     * Reads the argument value for the specified key, as a By instance.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public By readLocatorArgument(String argName, By defaultValue) {
        if (this.hasArgument(argName)) {
            return this.readLocatorArgument(argName);
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a By instance. The
     * element is identified by xpath, id, name or text.
     *
     * @param argName The argument whose value will be returned
     */
    protected By readLocatorArgument(String argName) {
        Object argumentValue = readArgument(argName);

        if (!(argumentValue instanceof Map)) {
            throw new RuntimeException(String.format(
                    "The \"%s\" argument was invalid. We expected it to be an "
                    + "object that contains at least one of the following "
                    + "properties: id, name, text, class, tag, css or xpath. The "
                    + "actual type of the argument value was %s.",
                    argName,
                    argName.getClass().getSimpleName()));
        }

        Map<String, Object> argValueAsMap = (Map<String, Object>) argumentValue;

        if (argValueAsMap.containsKey("id")) {
            return By.id(argValueAsMap.get("id").toString());
        } else if (argValueAsMap.containsKey("name")) {
            return By.name(argValueAsMap.get("name").toString());
        } else if (argValueAsMap.containsKey("text")) {
            return By.linkText(argValueAsMap.get("text").toString());
        } else if (argValueAsMap.containsKey("class")) {
            return By.className(argValueAsMap.get("class").toString());
        } else if (argValueAsMap.containsKey("tag")) {
            return By.tagName(argValueAsMap.get("tag").toString());
        } else if (argValueAsMap.containsKey("css")) {
            return By.cssSelector(argValueAsMap.get("css").toString());
        } else if (argValueAsMap.containsKey("xpath")) {
            if (argValueAsMap.get("xpath").toString().contains("''")) {
                return By.xpath(argValueAsMap.get("xpath").toString().replace("''", "'"));
            } else {
                return By.xpath(argValueAsMap.get("xpath").toString());
            }
        } else {
            throw new RuntimeException(
                    "You must identify the web element by providing at least one of the "
                    + "following properties: id, name, text, class, tag, css or xpath.");
        }
    }

    protected void scroll(String scrollDirection) {
        Logger.trace(String.format("WebTestAction.scroll (%s)", scrollDirection));
        JavascriptExecutor jse;
        jse = (JavascriptExecutor) driver;

        if (scrollDirection.equalsIgnoreCase("down")) {

            jse.executeScript("window.scrollBy(0,250)", "");

        } else if (scrollDirection.equalsIgnoreCase("up")) {
            jse.executeScript("window.scrollBy(0,-250)", "");
        }
    }

    public InputStream takeScreenshot() {
        try {
            //TODO: Maybe try to use robot to capture the whole desktop when alert is present
            // In some browsers, screenshots don't work when alert is present,
            // so we attempt to dismiss a potential alert in order to avoid
            // weird behavior or blocking the test forever
            try {
                // This logic doesn't curently work for Chrome 61.0.3163.100 (64-bit)
                WebDriverWait wait = new WebDriverWait(driver, 3);
                Alert alert = wait.until(ExpectedConditions.alertIsPresent());
                alert.dismiss();
            } catch (Throwable ex) {
            }
            byte[] screenshotBytes = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
            return new ByteArrayInputStream(screenshotBytes);
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Waits for JavaScript asynchronous logic in the web page to finish
     * (Angular, React, etc).
     */
    protected void waitForAsyncCallsToFinish() {
        try {
            JavascriptExecutor jsExecutor = (JavascriptExecutor) this.driver;
            NgWebDriver ngDriver = new NgWebDriver(jsExecutor);
            ngDriver.waitForAngularRequestsToFinish();
        } catch (Exception ex) {
            log.warning("The waitForAsyncCallsToFinish method failed.", ex);
        }
    }
}

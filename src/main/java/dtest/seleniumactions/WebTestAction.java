package dtest.seleniumactions;

import dtest.base.TestAction;
import dtest.base.logging.Logger;
import dtest.base.util.Configuration;
import dtest.seleniumactions.enums.Condition;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;
import org.apache.commons.lang3.StringUtils;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * This is the base class that all Web UI test actions must inherit from.
 */
public abstract class WebTestAction extends TestAction {

    protected static Properties config;

    /**
     * Stores a reference to the Selenium WebDriver object used for automation.
     */
    protected WebDriver driver;

    public WebTestAction() {
        try {
            WebTestAction.config = Configuration.getConfiguration("web.properties");
        } catch (Exception ex) {
            Logger.warning("Failed to read config file web.properties");
            WebTestAction.config = new Properties();
        }

        this.driver = SeleniumHelper.getDriver();
//        this.driver = LaunchBrowser();
    }

    @Override
    public void run() {
        super.run();
    }

    protected void scrollAndCheckElementVisible(By locator, String direction) {
        Logger.trace(String.format("WebTestAction.swipeAndCheckElementVisible (%s, %s)",
                locator,
                direction));

        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        int maxSwipeCount = Integer.valueOf(WebTestAction.config.getProperty("maxSwipeCount", "50"));

        for (int i = 0; i < maxSwipeCount; i++) {
            try {
                Logger.trace(String.format("WebTestAction.swipeAndCheckElementVisible iteration %s", i + 1));
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                Logger.debug(String.format("Found element %s", locator));
                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    //System.out.println(System.getProperty("user.dir"));
                    throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
                }

                Logger.trace(String.format("WebTestAction.swipeAndCheckElementVisible swiping %s", direction));
                scroll(direction);
            }
        }

        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
        }
    }

    protected void scrollAndCheckElementNotVisible(By locator, String direction) {
        Logger.trace(String.format("WebTestAction.scrollAndCheckElementNotVisible (%s, %s)",
                locator,
                direction));
        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        int maxScrollCount = Integer.valueOf(this.config.getProperty("maxScrollCount", "10"));

        for (int i = 0; i < maxScrollCount; i++) {
            try {
                Logger.trace(String.format("WebTestAction.scrollAndCheckElementNotVisible iteration %s", i + 1));
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                Logger.debug(String.format("Not Found element logic is TRUE - %s", locator));

                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    //System.out.println(System.getProperty("user.dir"));
                    throw new RuntimeException(String.format("Element is still present %s", locator.toString()));
                } else {
                    Logger.trace(String.format("WebTestAction.scrollAndCheckElementNotVisible swiping %s", direction));
                    scroll(direction);
                }
            }
        }

        if (elementWasFound) {
            throw new RuntimeException(String.format("Element is still present %s", locator));
        } else {
            Logger.trace(String.format("Element is NOT present %s", locator));
            //String message = "Element not found as expected " + locator.toString();
            //System.out.println(message);
        }
    }

    /**
     * Locates and returns a UI element
     *
     * @param locator Identifies the element to look for
     */
    protected WebElement getElement(By locator) {
        return getElement(locator, 10);
    }

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

    protected void waitForElementVisible(By locator, long waitIntervalSec) throws InterruptedException {
        waitForCondition(locator, Condition.VISIBILITY_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

    protected void waitForCondition(By locator, Condition condition, long waitIntervalSec) {
        try {
            Logger.trace(String.format("WebTestAction.waitForCondition (%s, %s, %s)",
                    locator,
                    condition.name(),
                    waitIntervalSec));

            WebDriverWait wait = new WebDriverWait(driver, waitIntervalSec);

            switch (condition) {
                case PRESENCE_OF_ELEMENT_LOCATED:
                    wait.until(ExpectedConditions.presenceOfElementLocated(locator));
                    break;
                case VISIBILITY_OF_ELEMENT_LOCATED:
                    wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
                    break;
                case INVISIBILITY_OF_ELEMENT_LOCATED:
                    wait.until(ExpectedConditions.invisibilityOfElementLocated(locator));
                    break;
            }
            Logger.trace(String.format("PASS: WebTestAction.waitForCondition (%s, %s, %s)",
                    locator,
                    condition.name(),
                    waitIntervalSec));
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Condition %s failed to verify in %s sec for element %s",
                    condition.name(),
                    waitIntervalSec,
                    locator), ex);
        }
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

        if (argumentValue instanceof String) {
            Map<String, Object> newArgValue = new HashMap<String, Object>();
            newArgValue.put("xpath", argumentValue);
            argumentValue = newArgValue;
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
                    "You must provide at least one identifier for the web element by populating "
                    + "at least 1 of the following properties: id, name, text, class, tag, css or xpath.");
        }
    }

    /*
     * Method is used to select a value from a drop down list
     */
    protected void selectDropDownValue(By locator) {
        System.out.println("INSIDE THE METHOD - SELECTDROPDOWNVALUE");
        //Click on dropdown to open list.
        WebElement element = getElement(locator);
        element.click();

    }

    /*
     * Method is used to get Page source from a given url
     */
    protected String getpageSource(String url) {
        StringBuilder sb = new StringBuilder();
        try {
            URL ur = new URL(url);
            // Read all the text returned by the server
            BufferedReader in = new BufferedReader(new InputStreamReader(ur.openStream()));
            String str;
            while ((str = in.readLine()) != null) {
                str = in.readLine();
                sb.append(str);
            }
        } catch (MalformedURLException ex) {
            java.util.logging.Logger.getLogger(WebTestAction.class.getName()).log(Level.SEVERE, null, ex);
        } catch (IOException ex) {
            java.util.logging.Logger.getLogger(WebTestAction.class.getName()).log(Level.SEVERE, null, ex);
        }
        return sb.toString();
    }

    /*
     * Method is used to find a string with begin and end tags from a source
     * string
     */
    protected String findinBetween(String source, String begin, String end) {
        String title = StringUtils.substringBetween(source, begin, end);

        return title;
    }

}

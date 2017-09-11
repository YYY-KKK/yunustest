package dtest.mobileactions;

import dtest.base.TestAction;
import dtest.mobileactions.enums.Condition;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import java.util.HashMap;
import java.util.Map;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class InitAppium extends TestAction {

    protected AppiumDriver<MobileElement> driver;

    @Override
    public void run() {
        super.run();
        
        String platform = readStringArgument("platform");
        String url = readStringArgument("url");
        Boolean resetDriver = readBooleanArgument("resetDriver", true);
        Map<String, Object> desiredCapabilities = readMapArgument("desiredCapabilities", new HashMap<>());

        boolean initialized = false;
        int retriesLeft = 3;

        while (!initialized && retriesLeft > 0) {
            --retriesLeft;

            try {
                AppiumHelper.initialize(platform, url, desiredCapabilities, resetDriver);
                driver = AppiumHelper.getDriver();

                initialized = true;
            } catch (Exception ex) {
                if (retriesLeft > 0) {
                    log.warning(String.format("Caught a %s exception while initializing Appium. Retries left: %s",
                            ex.getClass().getName(),
                            String.valueOf(retriesLeft)));
                } else {
                    throw ex;
                }
            }
        }
    }

    protected void waitForElementVisible(By locator, long waitIntervalSec) throws InterruptedException {
        waitForCondition(locator, Condition.VISIBILITY_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

    protected void waitForCondition(By locator, Condition condition, long waitIntervalSec) {
        try {
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
        } catch (Exception ex) {
            throw new RuntimeException("Failed to wait for condition", ex);
        }
    }

    protected MobileElement findElement(By element, long waitInterval) {
        waitForElementPresent(element, waitInterval);
        return driver.findElement(element);
    }

    protected void waitForElementPresent(By locator, long waitIntervalSec) {
        waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

}

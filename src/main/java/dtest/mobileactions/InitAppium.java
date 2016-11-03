package dtest.mobileactions;

import dtest.base.TestAction;
import dtest.mobileactions.enums.Condition;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.SessionNotCreatedException;
import org.openqa.selenium.remote.SessionNotFoundException;
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
        Boolean selectConfig = readBooleanArgument("selectConfig", false);

        boolean initialized = false;
        int retriesLeft = 3;

        while (!initialized && retriesLeft > 0) {
            --retriesLeft;

            try {
                Appium.initialize(platform, url, resetDriver);
                driver = Appium.getDriver();

                if (selectConfig) {
                    selectGmaConfig();
                }
                initialized = true;
            } catch (SessionNotFoundException | SessionNotCreatedException ex) {
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

    protected void swipeAndCheckElementVisible(By locator, String direction) {
        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;

        for (int i = 0; i < 20; i++) {
            try {
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                String message = "Found element " + locator.toString();
                System.out.println(message);
                break;
            } catch (Exception ex) {
                swipe(direction);
            }
        }

        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator));
        }
    }

    protected void swipe(String swipeType) {
        try {
            Dimension size;
            size = driver.manage().window().getSize();

            int startX = 0;
            int endX = 0;
            int startY = 0;
            int endY = 0;

            if (swipeType.equalsIgnoreCase("up") || swipeType.equalsIgnoreCase("down")) {
                //Find swipe start and end point from screen's with and height.
                //Find starty point which is at bottom side of screen.
                startY = (int) (size.height * 0.80);

                //Find endy point which is at top side of screen.
                endY = (int) (size.height * 0.20);

                //Find horizontal point where you wants to swipe. It is in middle of screen width.
                startX = size.width / 2;
            }

            if (swipeType.equalsIgnoreCase("left") || swipeType.equalsIgnoreCase("right")) {
                //find swipe start and end point from screen's width and height
                //Find startx point which is at the right of the screen
                startX = (int) (size.width * 0.90);

                //Find endx which is at the left side of the screen
                endX = (int) (size.width * 0.05);

                //Find the vertical point to swipe, it is in the middle of the screen height
                startY = size.height / 2;
            }

            //Swipe from Bottom to Top.
            if (swipeType.equalsIgnoreCase("down")) {
                driver.swipe(startX, startY, startX, endY, 3000);
                Thread.sleep(1000);
            }

            //Swipe from Top to Bottom.
            if (swipeType.equalsIgnoreCase("up")) {
                driver.swipe(startX, endY, startX, startY, 3000);
                Thread.sleep(1000);
            }

            if (swipeType.equalsIgnoreCase("left")) {
                //Swipe from right to left
                driver.swipe(startX, startY, endX, startY, 3000);
            }

            if (swipeType.equalsIgnoreCase("right")) {
                //swipe from left to right
                driver.swipe(endX, startY, startX, startY, 3000);
            }
        } catch (InterruptedException ex) {
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

    public void selectGmaConfig() {
        System.out.println("Inside Select GMA Config");

        /*try {
            By deny = By.xpath("//android.widget.Button[@resource-id='com.android.packageinstaller:id/permission_deny_button']");
            waitForCondition(deny, Condition.VISIBILITY_OF_ELEMENT_LOCATED, 5);
            findElement(deny, 1).click();
        } catch (Exception e) {
            e.printStackTrace();
        }*/
        try {
            By close = By.xpath("//android.widget.ImageView[@resource-id='com.mcdonalds.app.qa:id/close']");
            waitForCondition(close, Condition.VISIBILITY_OF_ELEMENT_LOCATED, 30);
            findElement(close, 1).click();

            /*By menu = By.xpath("//android.widget.ImageView[contains(@resource-id,'slide_handler')]");
            waitForCondition(menu, Condition.VISIBILITY_OF_ELEMENT_LOCATED, 180);
            swipeAndCheckElementVisible(menu, "none");
            findElement(menu, 1).click();

            By about = By.xpath("//android.widget.TextView[contains(@resource-id,'mcd_menu_about')]");
            swipeAndCheckElementVisible(about, "none");
            findElement(about, 1).click();

            By appVersion = By.xpath("//android.widget.TextView[contains(@resource-id,'app_version')]");
            waitForCondition(appVersion, Condition.VISIBILITY_OF_ELEMENT_LOCATED, 180);
            swipeAndCheckElementVisible(appVersion, "none");
            findElement(appVersion, 1).click();

            By config = By.xpath("//android.widget.TextView[@text='SAE eCP']");
            swipeAndCheckElementVisible(config, "down");
            findElement(config, 1).click();*/
        } catch (Exception e) {
            e.printStackTrace();
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

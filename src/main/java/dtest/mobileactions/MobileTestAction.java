package dtest.mobileactions;

import dtest.base.TestAction;
import dtest.mobileactions.enums.Condition;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.TouchAction;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.List;
import java.util.Map;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.Point;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 *
 * @author mc53437
 */
public abstract class MobileTestAction extends TestAction {

    protected AppiumDriver<MobileElement> driver;

    public MobileTestAction() {
        driver = Appium.getDriver();

        if (driver == null) {
            throw new RuntimeException("The Appium driver was not initialized. You must run the InitAppium action to do the initialization before using any of mobile-related test actions.");
        }
    }

    @Override
    public abstract void run();

    protected MobileElement findElement(By element, long waitInterval) {
        waitForElementPresent(element, waitInterval);
        return driver.findElement(element);
    }

    private boolean takeScreenshot(final String name) {
        String screenshotDirectory = System.getProperty("appium.screenshots.dir", System.getProperty("java.io.tmpdir", ""));
        File screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
        return screenshot.renameTo(new File(screenshotDirectory, String.format("%s.png", name)));
    }

    private String getCurrentTime() {
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("HHmmss");
        return sdf.format(cal.getTime());
    }

    protected By readLocatorArgument(String argName) {
        Map<String, Object> argValue = (Map<String, Object>) readArgument(argName);

        if (argValue.containsKey("xpath")) {
            if (argValue.get("xpath").toString().contains("''")) {
                return By.xpath(argValue.get("xpath").toString().replace("''", "'"));
            } else {
                return By.xpath(argValue.get("xpath").toString());
            }
        } else if (argValue.containsKey("id")) {
            return By.xpath(argValue.get("id").toString());
        } else if (argValue.containsKey("name")) {
            return By.xpath(argValue.get("name").toString());
        } else {
            throw new RuntimeException("Provide at least 1 identifier for the object by populating at least 1 of the following properties: xpath, id, name.");
        }
    }

    protected void hideKeyboard() {
        try {
            driver.hideKeyboard();
        } catch (Exception ex) {
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
                if (direction.equalsIgnoreCase("none")) {
                    throw new RuntimeException(String.format("Element %s not found", locator.toString()));
                }

                swipe(direction);
            }
        }

        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator));
        }
    }

    protected void swipeAndCheckElementNotVisible(By locator, String direction) {
        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;

        for (int i = 0; i < 20; i++) {
            try {
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                //String message = "Found element " + locator.toString();
                //System.out.println(message);
                break;
            } catch (Exception ex) {
                swipe(direction);
            }
        }

        if (elementWasFound) {
            throw new RuntimeException(String.format("Found element %s", locator));
        } else {
            String message = "Element not found as expected " + locator.toString();
            System.out.println(message);
        }
    }

    protected void swipe(int fromX, int fromY, int toX, int toY) throws InterruptedException {

        driver.swipe(fromX, fromY, toX, toY, 3000);
        Thread.sleep(1000);

    }

    protected void swipe(By containerLocator, String swipeDirection) {
        // Calculate the coordinates to swipe from/to

        //swipe(int fromX, int fromY, int toX, int toY);
    }

    protected void swipe(String swipeDirection) {
        // Calculate the coordinates to swipe from/to

        //swipe(int fromX, int fromY, int toX, int toY);
        try {
            Dimension size;
            size = driver.manage().window().getSize();

            int startX = 0;
            int endX = 0;
            int startY = 0;
            int endY = 0;

            if (swipeDirection.equalsIgnoreCase("up") || swipeDirection.equalsIgnoreCase("down")) {
                //Find swipe start and end point from screen's with and height.
                //Find starty point which is at bottom side of screen.
                startY = (int) (size.height * 0.80);

                //Find endy point which is at top side of screen.
                endY = (int) (size.height * 0.20);

                //Find horizontal point where you wants to swipe. It is in middle of screen width.
                startX = size.width / 2;
            }

            if (swipeDirection.equalsIgnoreCase("left") || swipeDirection.equalsIgnoreCase("right")) {
                //find swipe start and end point from screen's width and height
                //Find startx point which is at the right of the screen
                startX = (int) (size.width * 0.90);

                //Find endx which is at the left side of the screen
                endX = (int) (size.width * 0.05);

                //Find the vertical point to swipe, it is in the middle of the screen height
                startY = size.height / 2;
            }

            //Swipe from Bottom to Top.
            if (swipeDirection.equalsIgnoreCase("down")) {
                //driver.swipe(startX, startY, startX, endY, 3000);
                swipe(startX, startY, startX, endY);
                //Thread.sleep(1000);
            }

            //Swipe from Top to Bottom.
            if (swipeDirection.equalsIgnoreCase("up")) {
//                driver.swipe(startX, endY, startX, startY, 3000);
//                Thread.sleep(1000);
                swipe(startX, endY, startX, startY);
            }

            if (swipeDirection.equalsIgnoreCase("left")) {
                //Swipe from right to left
//                driver.swipe(startX, startY, endX, startY, 3000);
                swipe(startX, startY, endX, startY);
            }

            if (swipeDirection.equalsIgnoreCase("right")) {
                //swipe from left to right
                //driver.swipe(endX, startY, startX, startY, 3000);
                swipe(endX, startY, startX, startY);
            }
        } catch (InterruptedException ex) {
        }
    }

    protected void swipeUp(MobileElement element) {
        Point point = element.getLocation();
        Dimension size = driver.manage().window().getSize();

        int screenHeight = (int) (size.height * 0.10);
        int elementY = point.getY();

        int endX = 0;
        int endY = ((int) screenHeight - elementY);

        TouchAction action = new TouchAction((MobileDriver) driver);
        action.press(element).moveTo(endX, endY).release().perform();

    }

    protected void swipeDown(MobileElement element) {
        Point point = element.getLocation();
        Dimension size = driver.manage().window().getSize();

        int screenHeight = (int) (size.height * 0.90);
        int elementY = point.getY();

        int endX = 0;
        int endY = ((int) screenHeight - elementY);

        TouchAction action = new TouchAction((MobileDriver) driver);
        action.press(element).moveTo(endX, endY).release().perform();

    }

    protected void swipeLeft(MobileElement element) {
        Point point = element.getLocation();
        Point p = element.getCenter();

        Dimension size = driver.manage().window().getSize();

        //int screenWidth = (int) (size.width * 0.90);
        //int elementX = point.getX();
        int elementX = p.getX();

        int endY = 0;
        int endX = 0 - elementX + point.getX();

        System.out.println("End X :" + endX);

        TouchAction action = new TouchAction((MobileDriver) driver);
        action.press(element).moveTo(endX, endY).release().perform();

    }

    protected void swipeRight(MobileElement element) {
        Point point = element.getLocation();
        Point p = element.getCenter();

        Dimension size = driver.manage().window().getSize();

        //int screenWidth = (int) (size.width * 0.90);
        //int elementX = point.getX();
        int elementX = p.getX();

        int endY = 0;
        int endX = elementX;

        TouchAction action = new TouchAction((MobileDriver) driver);
        action.press(element).moveTo(endX, endY).release().perform();

    }

    protected void navigateBack() {
        driver.navigate().back();
    }

    protected void waitForElementPresent(By locator, long waitIntervalSec) {
        waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, waitIntervalSec);
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

        try {
            By menu = By.xpath("//android.widget.ImageView[contains(@resource-id,'slide_handler')]");
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
            findElement(config, 1).click();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    protected void selectDropDownValue(By locator) {
        System.out.println("INSIDE THE METHOD - SELECTDROPDOWNVALUE");
        //Click on dropdown to open list.
        MobileElement element = findElement(locator, 180);
        element.click();

        By locator1 = By.className("android.widget.TextView");
        //By.xpath("//android.widget.TextView[@text='Medium']");
        //MobileElement element1 = findElement(locator1, 180);
        //element1.click();

        //Locate all drop down list elements 
        List dropList = driver.findElements(locator1);
        //Extract text from each element of drop down list one by one.  
        for (int i = 0; i < dropList.size(); i++) {
            MobileElement listItem = (MobileElement) dropList.get(i);
            System.out.println(listItem.getText());
        }

    }

    protected void endScroll(By locator, String direction) {

        boolean elementWasFound = false;
        boolean swipe = true;
        String lastElement = null;

        while (swipe) {

            try {
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                String message = "Found element " + locator.toString();
                System.out.println(message);
                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    throw new RuntimeException(String.format("Element %s not found", locator.toString()));
                }
                /*if (returnElementPosition(findElement(locator, 1))) {
                    swipe(direction);
                } else {
                    break;
                }*/
            }
        }
        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator));
        }

    }

    protected void returnElementPosition(MobileElement element) {

        Point point;
        MobileElement element1;

        List<MobileElement> allElements = (List<MobileElement>) element.findElements(By.xpath(".//*"));

        for (int i = 0; i < allElements.size(); i++) {
            element1 = allElements.get(i);
            point = element1.getLocation();

            int x = point.getX();
            int y = point.getY();

            int width = element.getSize().width;
            int height = element.getSize().height;
            break;
        }
    }
}

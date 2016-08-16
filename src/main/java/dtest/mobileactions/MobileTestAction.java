package dtest.mobileactions;

import dtest.base.TestAction;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Map;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.OutputType;
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
    public abstract void run() throws Exception;

    protected MobileElement findElement(By element, long waitInterval) throws InterruptedException, Exception {
        waitForElementPresence(element, waitInterval);
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

    protected By getLocatorArgument(String argName) {
        Map<String, Object> argValue = (Map<String, Object>) readArgument(argName);

        if (argValue.containsKey("xpath")) {
            return By.xpath(argValue.get("xpath").toString());
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
        } catch (Exception e) {

        }
    }

    protected void swipeAndFindElement(By locator) throws InterruptedException, Exception {
        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        
        for (int i = 0; i < 20; i++) {
            try {
                waitForElementPresence(locator, 1);
                elementWasFound = true;
                break;
            } catch (Exception ex) {
                swipeVertical("Down");
            }
        }
        
        if (!elementWasFound) {
            throw new Exception(String.format("Could not find element %s", locator));
        }
    }

    protected void swipeVertical(String swipeType) throws InterruptedException {
        //Get the size of screen.
        Dimension size;
        size = driver.manage().window().getSize();
        System.out.println(size);

        //Find swipe start and end point from screen's with and height.
        //Find starty point which is at bottom side of screen.
        int starty = (int) (size.height * 0.80);

        //Find endy point which is at top side of screen.
        int endy = (int) (size.height * 0.20);

        //Find horizontal point where you wants to swipe. It is in middle of screen width.
        int startx = size.width / 2;

        //Swipe from Bottom to Top.
        if (swipeType.equalsIgnoreCase("Down")) {
            driver.swipe(startx, starty, startx, endy, 3000);
            Thread.sleep(1000);
        }

        //Swipe from Top to Bottom.
        if (swipeType.equalsIgnoreCase("Up")) {
            driver.swipe(startx, endy, startx, starty, 3000);
            Thread.sleep(1000);
        }
    }
    protected void navigateBack() {
        driver.navigate().back();
    }
    
    protected void waitForElementPresence(By locator, long waitIntervalSec) throws InterruptedException {
        waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

    protected void waitForCondition(By locator, Condition condition, long waitIntervalSec) {
        WebDriverWait wait = new WebDriverWait(driver, waitIntervalSec);

        switch (condition) {
            case PRESENCE_OF_ELEMENT_LOCATED:
                wait.until(ExpectedConditions.presenceOfElementLocated(locator));
                break;
            case VISIBILITY_OF_ELEMENT_LOCATED:
                wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
                break;
        }
    }
}

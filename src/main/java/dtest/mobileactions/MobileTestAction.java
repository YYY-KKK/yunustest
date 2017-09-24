package dtest.mobileactions;

import dtest.base.TestAction;
import dtest.base.logging.Logger;
import dtest.base.util.Config;
import dtest.mobileactions.enums.Condition;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.TouchAction;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.Point;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public abstract class MobileTestAction extends TestAction {

    protected static Config config;

    protected AppiumDriver<MobileElement> driver;

    public MobileTestAction() {
        try {
            if (MobileTestAction.config == null) {
                MobileTestAction.config = Config.load("mobile.properties");
            }
        } catch (Exception ex) {
            Logger.warning("Failed to read config file mobile.properties");
            MobileTestAction.config = new Config();
        }

        this.driver = AppiumHelper.getDriver();
        if (this.driver == null) {
            throw new RuntimeException("The Appium driver was not initialized. You must run the InitAppium action to do the initialization before using any of mobile-related test actions.");
        }

        long implicitWaitSec = Long.valueOf(this.config.getString("implicitWaitSec", "5"));
        this.driver.manage().timeouts().implicitlyWait(implicitWaitSec, TimeUnit.SECONDS);
    }

    @Override
    public void run() {
        super.run();
    }

    private String getCurrentTime() {
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("HHmmss");
        return sdf.format(cal.getTime());
    }

    /**
     * Locates and returns a UI element
     *
     * @param locator Identifies the element to look for
     */
    protected MobileElement getElement(By locator) {
        return getElement(locator, 10);
    }

    /**
     * Locates and returns a UI element
     *
     * @param locator Identifies the element to look for
     * @param timeoutSec Maximum time to wait for the element to become
     * available
     * @return The UI element that was requested
     */
    protected MobileElement getElement(By locator, int timeoutSec) {
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

    protected By readLocatorArgument(String argName) {
        Object argumentValue = readArgument(argName);

        if (argumentValue instanceof String) {
            Map<String, Object> newArgValue = new HashMap<String, Object>();
            newArgValue.put("xpath", argumentValue);
            argumentValue = newArgValue;
        }

        Map<String, Object> argValueAsMap = (Map<String, Object>) argumentValue;

        if (argValueAsMap.containsKey("xpath")) {
            if (argValueAsMap.get("xpath").toString().contains("''")) {
                return By.xpath(argValueAsMap.get("xpath").toString().replace("''", "'"));
            } else {
                return By.xpath(argValueAsMap.get("xpath").toString());
            }
        } else if (argValueAsMap.containsKey("id")) {
            return By.id(argValueAsMap.get("id").toString());

        } else if (argValueAsMap.containsKey("name")) {
            return By.name(argValueAsMap.get("name").toString());

        } else {
            throw new RuntimeException("Provide at least 1 identifier for the object by populating at least 1 of the following properties: xpath, id, name.");
        }

    }

    //TODO: This method must be removed after refactoring the code that uses it
    protected By readLocatorArgumentUpdateWithEnabled(String argName) {
        Object argumentValue = readArgument(argName);

        if (argumentValue instanceof String) {
            Map<String, Object> newArgValue = new HashMap<String, Object>();
            newArgValue.put("xpath", argumentValue);
            argumentValue = newArgValue;
        }

        Map<String, Object> argValueAsMap = (Map<String, Object>) argumentValue;

        if (argValueAsMap.containsKey("xpath")) {
            if (argValueAsMap.get("xpath").toString().contains("''")) {
                return By.xpath(argValueAsMap.get("xpath").toString().replace("''", "'") + "[@enabled='true']");
            } else {
                return By.xpath(argValueAsMap.get("xpath").toString() + "[@enabled='true']");
            }
        } else if (argValueAsMap.containsKey("id")) {
            return By.xpath(argValueAsMap.get("id").toString());
        } else if (argValueAsMap.containsKey("name")) {
            return By.xpath(argValueAsMap.get("name").toString());
        } else {
            throw new RuntimeException("Provide at least 1 identifier for the object by populating at least 1 of the following properties: xpath, id, name.");
        }
    }

    protected void hideKeyboard() {
        try {
            driver.hideKeyboard();
        } catch (Exception ex) {
            Logger.warning("There was an error while trying to hide the keyboard", ex);
        }
    }

    protected void swipeAndCheckElementVisible(By locator, String direction) {
        Logger.trace(String.format("MobileTestAction.swipeAndCheckElementVisible (%s, %s)",
                locator,
                direction));

        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        int maxSwipeCount = Integer.valueOf(MobileTestAction.config.getString("maxSwipeCount", "50"));

        for (int i = 0; i < maxSwipeCount; i++) {
            try {
                Logger.trace(String.format("MobileTestAction.swipeAndCheckElementVisible iteration %s", i + 1));
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                Logger.debug(String.format("Found element %s", locator));
                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
                }

                swipe(direction);
            }
        }

        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
        }
    }

    protected void swipeAndCheckElementNotVisible(By locator, String direction) {
        Logger.trace(String.format("MobileTestAction.swipeAndCheckElementNotVisible (%s, %s)",
                locator,
                direction));
        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        int maxSwipeCount = Integer.valueOf(this.config.getString("maxSwipeCount", "50"));

        for (int i = 0; i < maxSwipeCount; i++) {
            try {
                Logger.trace(String.format("MobileTestAction.swipeAndCheckElementNotVisible iteration %s", i + 1));
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                Logger.debug(String.format("Not Found element logic is TRUE - %s", locator));

                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    //System.out.println(System.getProperty("user.dir"));
                    throw new RuntimeException(String.format("Element is still present %s", locator.toString()));
                } else {
                    Logger.trace(String.format("MobileTestAction.swipeAndCheckElementNotVisible swiping %s", direction));
                    swipe(direction);
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

    protected void swipe(int fromX, int fromY, int toX, int toY) {
        Logger.trace(String.format("MobileTestAction.swipe (%s, %s, %s, %s)",
                fromX, fromY, toX, toY));

        driver.swipe(fromX, fromY, toX, toY, 1000);
//        int relativeX = toX - fromX;
//        int relativeY = toY - fromY;
//
//        (new TouchAction(driver))
//                .press(fromX, fromY)
//                .moveTo(relativeX, relativeY)
//                .waitAction(Duration.ofMillis(500))
//                .release()
//                .perform();
    }

    protected void swipe(String swipeDirection) {
        Logger.trace(String.format("MobileTestAction.swipe(%s)", swipeDirection));

        Dimension screenSize;
        screenSize = driver.manage().window().getSize();

        int startX, endX, startY, endY;

        startX = endX = screenSize.width / 2;
        startY = endY = screenSize.height / 2;

        if (swipeDirection.equalsIgnoreCase("down")) {
            startY = (int) (screenSize.height * 0.80);
            endY = (int) (screenSize.height * 0.20);
        } else if (swipeDirection.equalsIgnoreCase("up")) {
            startY = (int) (screenSize.height * 0.20);
            endY = (int) (screenSize.height * 0.80);
        } else if (swipeDirection.equalsIgnoreCase("left")) {
            startX = (int) (screenSize.width * 0.90);
            endX = (int) (screenSize.width * 0.10);
        } else if (swipeDirection.equalsIgnoreCase("right")) {
            startX = (int) (screenSize.width * 0.10);
            endX = (int) (screenSize.width * 0.90);
        }

        swipe(startX, startY, endX, endY);
    }

    protected void swipeUp(MobileElement element) {
        Point point = element.getLocation();
        Dimension size = driver.manage().window().getSize();
        if (AppiumHelper.isPlatform("android")) {
            int screenHeight = (int) (size.height * 0.10);
            int elementY = point.getY();

            int endX = 0;
            int endY = ((int) screenHeight - (elementY + element.getSize().height));

            TouchAction action = new TouchAction((MobileDriver) driver);
//              Logger.debug("Device height:"+size.getHeight()+"$$$ Device width:"+size.getWidth());
//              Logger.debug("Element X:"+point.getX()+"$$$ Element Y:"+point.getY());
//              Logger.debug("Element Height:"+element.getSize().height+"$$$$ Element Width:"+element.getSize().width);
//              Logger.debug("end X:"+endX+"$$$$end Y:"+endY);
            //action.press(element).moveTo(endX, endY).release().perform();
            action.press(element.getCenter().getX(), element.getCenter().getY()).moveTo(endX, screenHeight - element.getCenter().getY()).release().perform();

        } else {
            int endx = (int) (size.width * 0.8);
            int startx = (int) (size.width * 0.2);
            int endy = (int) (size.height / 1.5);
            int starty = (int) (size.height / 8);

            TouchAction action = new TouchAction((MobileDriver) driver);
            action.press(startx, endy).moveTo(-startx, -endy).release().perform();
        }
    }

    protected void swipeDown(MobileElement element) {
        Point point = element.getLocation();
        Dimension size = driver.manage().window().getSize();

        int screenHeight = (int) (size.height * 0.90);
        int elementY = point.getY();

        int endX = 0;
        int endY = ((int) screenHeight - elementY);
//        Logger.debug("Device height:" + size.getHeight() + "$$$ Device width:" + size.getWidth());
//        Logger.debug("Element X:" + point.getX() + "$$$ Element Y:" + point.getY());
//        Logger.debug("Element Height:" + element.getSize().height + "$$$$ Element Width:" + element.getSize().width);
//        Logger.debug("end X:" + endX + "$$$$end Y:" + endY);
        TouchAction action = new TouchAction((MobileDriver) driver);
        //action.press(element).moveTo(endX, endY).release().perform();
        action.press(element.getCenter().getX(), element.getCenter().getY()).moveTo(endX, screenHeight - element.getCenter().getY()).release().perform();

    }

    protected void swipeLeft(MobileElement element) {
        Point point = element.getLocation();
        Point p = element.getCenter();
        Dimension size = driver.manage().window().getSize();
        if (AppiumHelper.isPlatform("android")) {
            int screenWidth = (int) (size.width * 0.10);
            // int elementX = point.getX();
            int elementX = p.getX();

            int endY = 0;
            int endX = 0 - (element.getSize().getWidth());

            //        Logger.debug("Device height:" + size.getHeight() + "$$$ Device width:" + size.getWidth());
            //        Logger.debug("Element X:" + point.getX() + "$$$ Element Y:" + point.getY());
            //        Logger.debug("Element Height:" + element.getSize().height + "$$$$ Element Width:" + element.getSize().width);
            //        Logger.debug("end X:" + endX + "$$$$end Y:" + endY);
            TouchAction action = new TouchAction((MobileDriver) driver);
            //action.press(element).moveTo(endX, endY).release().perform();
            action.press((int) (point.getX() + (element.getSize().getWidth() * 0.90)), element.getCenter().getY()).moveTo((int) (screenWidth - (point.getX() + (element.getSize().getWidth() * 0.90))), endY).release().perform();

        } else {
            int endY = 0;
            int startX = (int) (size.width - 10);
            int startY = (int) (size.height / 1.8);

            TouchAction action = new TouchAction((MobileDriver) driver);
            action.press(startX, startY).moveTo(-startX, endY).release().perform();
        }
    }

    protected void swipeRight(MobileElement element) {
        Point point = element.getLocation();
        Point p = element.getCenter();

        Dimension size = driver.manage().window().getSize();

        int screenWidth = (int) (size.width * 0.90);
        // int elementX = point.getX();
        int elementX = p.getX();

        int endY = 0;
        int endX = element.getSize().getWidth();
//        Logger.debug("Device height:" + size.getHeight() + "$$$ Device width:" + size.getWidth());
//        Logger.debug("Element X:" + point.getX() + "$$$ Element Y:" + point.getY());
//        Logger.debug("Element Height:" + element.getSize().height + "$$$$ Element Width:" + element.getSize().width);
//        Logger.debug("end X:" + endX + "$$$$end Y:" + endY);
        TouchAction action = new TouchAction((MobileDriver) driver);
        //action.press(element).moveTo(endX, endY).release().perform();
        action.press((int) (point.getX() + (element.getSize().getWidth() * 0.10)), element.getCenter().getY()).moveTo((int) (screenWidth - (point.getX() + (element.getSize().getWidth() * 0.10))), endY).release().perform();

    }

    public InputStream takeScreenshot() {
        try {
            File screenshotFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            File newScreenshotFile = null;

            try {
                // In case the "appium.screenshots.dir" is set, save the screenshot
                // file in that location. This is primarily intended for making
                // the screenshot visible in the AWS Device Farm web UI.
                String screenshotDirectory = System.getProperty("appium.screenshots.dir", null);
                if (screenshotDirectory == null) {
                    screenshotDirectory = Paths.get(System.getProperty("user.dir"), "screenshots").toString();
                    File file = new File(screenshotDirectory);
                    if (!file.exists()) {
                        file.mkdirs();
                    }
                }

                newScreenshotFile = new File(
                        screenshotDirectory,
                        String.format("%s_%s.png",
                                this.getSession().currentTestName,
                                new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date())));
                screenshotFile.renameTo(newScreenshotFile);
                Logger.info(String.format("Captured screenshot at %s", newScreenshotFile.getAbsolutePath()));
            } catch (Exception ex) {
                Logger.warning("Failed to capture screenshot", ex);
            }

            if (newScreenshotFile != null) {
                return new FileInputStream(newScreenshotFile);
            } else {
                return null;
            }
        } catch (Exception ex) {
            return null;
        }
    }

    protected void waitForElementPresent(By locator, long waitIntervalSec) {
        waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

    protected void waitForElementVisible(By locator, long waitIntervalSec) throws InterruptedException {
        waitForCondition(locator, Condition.VISIBILITY_OF_ELEMENT_LOCATED, waitIntervalSec);
    }

    protected void waitForCondition(By locator, Condition condition, long waitIntervalSec) {
        try {
            Logger.trace(String.format("MobileTestAction.waitForCondition (%s, %s, %s)",
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
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Condition %s failed to verify in %s sec for element %s",
                    condition.name(),
                    waitIntervalSec,
                    locator), ex);
        }
    }

    protected void selectDropDownValue(By locator) {
        System.out.println("INSIDE THE METHOD - SELECTDROPDOWNVALUE");
        //Click on dropdown to open list.
        MobileElement element = getElement(locator);
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
                /*
                 * if (returnElementPosition(findElement(locator, 1))) {
                 * swipe(direction); } else { break; }
                 */
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
    
    protected void EndOfSwipe(By locator, String direction) {

        MobileElement lastElement = null;
        MobileElement firstElement = null;

        String prevFirstElementTxt = null;
        String prevLastElementTxt = null;

        String curFirstElementTxt = null;
        String curLastElementTxt = null;

        List<MobileElement> elements;

        Logger.trace(String.format("MobileTestAction.swipeAndCheckElementVisible (%s, %s)",
                locator,
                direction));

        // TODO: Revisit this and implement a smarter algorithm - not ok to repeat this for an arbitrary number of times
        boolean elementWasFound = false;
        boolean endOfPage = false;
        int startCount = 0;

        while (!elementWasFound && !endOfPage) {
            try {
                startCount++;
                prevFirstElementTxt = (curFirstElementTxt != null) ? curFirstElementTxt : null;
                prevLastElementTxt = (curLastElementTxt != null) ? curLastElementTxt : null;

                elements = (List<MobileElement>) driver.findElements(By.className("android.widget.TextView"));
                System.out.println("Total Elements : " + elements.size());

                firstElement = elements.get(0);
                curFirstElementTxt = elements.get(0).getText();
                System.out.println("First Element : " + curFirstElementTxt);

                lastElement = elements.get(elements.size() - 1);
                curLastElementTxt = lastElement.getText();
                System.out.println("Last Element : " + curLastElementTxt);

                if (!direction.equalsIgnoreCase("left")) {
                    if (prevFirstElementTxt != null && prevLastElementTxt != null) {
                        if ((prevFirstElementTxt.equals(curFirstElementTxt)) && (prevLastElementTxt.equals(curLastElementTxt))) {
                            endOfPage = true;
                            break;
                        }
                    }
                } else if (startCount == 10) {
                    endOfPage = true;
                    break;
                }
                waitForElementVisible(locator, 1);
                elementWasFound = true;
                Logger.debug(String.format("Found element %s", locator));
                break;
            } catch (Exception ex) {
                if (direction.equalsIgnoreCase("none")) {
                    throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
                }

                Logger.trace(String.format("MobileTestAction.swipeAndCheckElementVisible swiping %s", direction));
                swipe(direction);
            }
        }

        if (!elementWasFound) {
            throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
        }

    }

    protected void longPress(MobileElement element, Integer durationMs) {
        Logger.trace(String.format("MobileTestAction.longPress (%s, %s)",
                element.getId(), durationMs));
        TouchAction action = new TouchAction((MobileDriver) driver);
        action.longPress(element, durationMs).release().perform();
        //action.longPress(element, Duration.ofMillis(durationMs)).release().perform();
    }

}

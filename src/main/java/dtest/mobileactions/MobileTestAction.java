/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.mobileactions;

import dtest.base.TestAction;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.ios.IOSDriver;
import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Map;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 *
 * @author mc53437
 */
public abstract class MobileTestAction extends TestAction {

    public static AppiumDriver<MobileElement> driver;
    private static final Object SYNC_OBJECT = new Object();

    private static Boolean isInitialized = false;

    @Override
    public abstract void run() throws Exception;

    @Override
    public void initialize() {
        if (!MobileTestAction.isInitialized) {
            synchronized (MobileTestAction.SYNC_OBJECT) {
                if (!MobileTestAction.isInitialized) {
                    String platform = readStringArgument("platform", "AUTO").toUpperCase();
                    MobileTestAction.initializeDriver(platform);
                    MobileTestAction.isInitialized = true;
                }
            }
        }
    }

    private static void initializeDriver(String platform) {
        try {
            if (platform.equalsIgnoreCase("ANDROID")) {
                DesiredCapabilities cap = new DesiredCapabilities();
                cap.setCapability(CapabilityType.BROWSER_NAME, "");
                cap.setCapability("deviceName", "Android Emulator");
                cap.setCapability("platformName", "Android");
                //cap.setCapability(MobileCapabilityType.APP_PACKAGE, "");
                //cap.setCapability("avd", "AVD_for_Galaxy_Nexus_by_Google");
                //cap.setCapability("useLocationServices", "true");
                //cap.setCapability("autoAcceptAlerts","true");
                cap.setCapability("newCommandTimeout", 600);
                //cap.setCapability("unicodeKeyboard", true);
                //cap.setCapability("resetKeyboard", true);

                driver = new AndroidDriver<>(new URL("http://127.0.0.1:4723/wd/hub"), cap);
            } else if (platform.equalsIgnoreCase("IOS")) {
                DesiredCapabilities cap = new DesiredCapabilities();
                cap.setCapability(CapabilityType.BROWSER_NAME, "");
                cap.setCapability("deviceName", "iOS Emulator");
                cap.setCapability("platformName", "iOS");
                //cap.setCapability(MobileCapabilityType.APP_PACKAGE, "");
                //cap.setCapability("useLocationServices", "true");
                //cap.setCapability("autoAcceptAlerts","true");
                cap.setCapability("newCommandTimeout", 600);
                //cap.setCapability("unicodeKeyboard", true);
                //cap.setCapability("resetKeyboard", true);

                driver = new IOSDriver<>(new URL("http://127.0.0.1:4723/wd/hub"), cap);
            } else {
                throw new RuntimeException("Failed to instantiate Appium driver. The \"platform\" global argument is missing or is specified incorrectly. Accepted values are \"IOS\" or \"ANDROID\".");
            }
            //confirmDeviceLocation();
            Thread.sleep(10000);
            isInitialized = true;
        } catch (MalformedURLException | InterruptedException e) {
        }
    }

    protected boolean waitForElement(By by, long waitIntervalSec) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, waitIntervalSec);
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(by));
            System.out.println("The Element Exist : " + by.toString());
            return true;

        } catch (Exception e) {
            System.out.println("The Element Does Not Exist : " + by.toString());
            return false;
        }
    }

    protected boolean waitForElement(By by, String condition, long waitIntervalSec) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, waitIntervalSec);
        try {
            if (condition.equalsIgnoreCase("visibilityOfElementLocated")) {
                wait.until(ExpectedConditions.visibilityOfElementLocated(by));
            } else if (condition.equalsIgnoreCase("presenceOfElementLocated")) {
                wait.until(ExpectedConditions.presenceOfElementLocated(by));
            }
            System.out.println("The Element Exist : " + by.toString());
            return true;

        } catch (Exception e) {
            System.out.println("The Element Does Not Exist : " + by.toString());
            return false;
        }
    }

    protected MobileElement findElement(By element, long waitInterval) throws InterruptedException, Exception {

        boolean exist = waitForElement(element, waitInterval);

        if (exist) {
            try {
                return driver.findElement(element);
            } catch (Exception e) {
                String fileName = this.getClass().toString() + "_" + getCurrentTime();
                takeScreenshot(fileName);
                String message = String.format("Could not find element with the locator: %s", element.toString());
                throw new Exception(message);
            }
        } else {
            String fileName = this.getClass().toString() + "_" + getCurrentTime();
            takeScreenshot(fileName);
            String message = String.format("Timeout expired for waiting the element with the locator: %s", element.toString());
            throw new Exception(message);
        }
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

    protected boolean swipeAndFindElement(By element) throws InterruptedException {
        boolean foundElement = false;

        for (int i = 0; i < 20; i++) {
            boolean exist = waitForElement(element, 1);
            if (exist) {
                foundElement = true;
                break;
            } else {
                swipeVertical("Down");
            }
        }
        return foundElement;
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
}

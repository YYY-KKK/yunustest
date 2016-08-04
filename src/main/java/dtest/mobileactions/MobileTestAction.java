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
                    String platform = readStringArgument("platform").toUpperCase();
                    MobileTestAction.initializeDriver(platform);
                    MobileTestAction.isInitialized = true;
                }
            }
        }
    }

    private static void initializeDriver(String platform) {
        try {
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
            if (platform.equalsIgnoreCase("ANDROID")){
                driver = new AndroidDriver<>(new URL("http://127.0.0.1:4723/wd/hub"), cap);
            } else {
                driver = new IOSDriver<>(new URL("http://127.0.0.1:4723/wd/hub"), cap);
            }
            //confirmDeviceLocation();
            Thread.sleep(10000);
            isInitialized = true;
        } catch (MalformedURLException | InterruptedException e) {
        }
    }

    protected boolean waitForVisibilityOfElement(By by, long waitInterval) throws InterruptedException {
        WebDriverWait wait = new WebDriverWait(driver, waitInterval);
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(by));
            System.out.println("The Element Exist : " + by.toString());
            return true;

        } catch (Exception e) {
            System.out.println("The Element Does Not Exist : " + by.toString());
            return false;
        }
    }

    protected MobileElement findElement(By element, long waitInterval) throws InterruptedException, Exception {

        boolean exist = waitForVisibilityOfElement(element, waitInterval);

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
        Map<String, Object> argValue = (Map<String, Object>)readArgument(argName);
        
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
}

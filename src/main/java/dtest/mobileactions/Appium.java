package dtest.mobileactions;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.ios.IOSDriver;
import java.net.MalformedURLException;
import java.net.URL;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;

/**
 * Helper class that initializes and exposes the Appium driver.
 */
public final class Appium {
    private static AppiumDriver<MobileElement> driver;
    
    private static boolean isInitialized = false;
    
    public static AppiumDriver<MobileElement> getDriver() {
        return driver;
    }
    
    public static void initialize(String platform, String url, Boolean resetDriver) {
        if (resetDriver && driver != null) {
            driver.quit();
            driver = null;
            isInitialized = false;
        }
        
        synchronized (Appium.class) {
            if (!isInitialized) {
                initializeDriver(platform, url);
                isInitialized = true;
            }
        }
    }
    
    private static void initializeDriver(String platform, String url) {
        if (url == null) {
            url = "http://127.0.0.1:4723/wd/hub";
        }
        
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

                driver = new AndroidDriver<>(new URL(url), cap);
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

                driver = new IOSDriver<>(new URL(url), cap);
            } else {
                throw new RuntimeException("Failed to instantiate Appium driver. The \"platform\" global argument is missing or is specified incorrectly. Accepted values are \"IOS\" or \"ANDROID\".");
            }
            //confirmDeviceLocation();
            Thread.sleep(10000);
            isInitialized = true;
        } catch (MalformedURLException | InterruptedException e) {
        }
    }
}

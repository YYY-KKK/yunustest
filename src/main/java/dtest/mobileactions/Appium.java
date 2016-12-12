package dtest.mobileactions;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.ios.IOSDriver;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;

/**
 * Helper class that initializes and exposes the Appium driver.
 */
public final class Appium {
    private static AppiumDriver<MobileElement> driver;
    
    private static boolean isInitialized = false;
    
    private static String platform;
    
    public static AppiumDriver<MobileElement> getDriver() {
        return driver;
    }
    
    public static String getPlatform() {
        return platform;
    }
    
    public static void initialize(String platform, String url, Map<String, Object> desiredCapabilities, Boolean resetDriver) {
        platform = platform.trim().toLowerCase();
        Appium.platform = platform;
                
        if (resetDriver && driver != null) {
            driver.quit();
            driver = null;
            isInitialized = false;
        }
        
        synchronized (Appium.class) {
            if (!isInitialized) {
                initializeDriver(platform, url, desiredCapabilities);
                isInitialized = true;
            }
        }
    }
    
    private static void initializeDriver(String platform, String url, Map<String, Object> desiredCapabilities) {
        if (url == null) {
            url = "http://127.0.0.1:4723/wd/hub";
        }
        
        DesiredCapabilities caps = new DesiredCapabilities();
        
        // Changes for running on Perfecto
        // caps.setCapability("user", "abc123456@perfectomobile.com");
        // caps.setCapability("password", "123456");
        // caps.setCapability("scriptName", "McDonalds");      
        // caps.setCapability("deviceName", "93C74BC6");
        // caps.setCapability("appPackage", "com.mcdonalds.app.qa");
        
        caps.setCapability(CapabilityType.BROWSER_NAME, "");
        caps.setCapability("newCommandTimeout", 600);
        //cap.setCapability("useLocationServices", "true");
        //cap.setCapability("autoAcceptAlerts","true");
        //cap.setCapability("unicodeKeyboard", true);
        //cap.setCapability("resetKeyboard", true);
                
        try {
            if (platform.equalsIgnoreCase("android")) {
                caps.setCapability("deviceName", "Android Emulator");
                caps.setCapability("platformName", "Android");
                
                setCapabilities(desiredCapabilities, caps);
                
                driver = new AndroidDriver<>(new URL(url), caps);
            } else if (platform.equalsIgnoreCase("ios")) {
                caps.setCapability("deviceName", "iOS Emulator");
                caps.setCapability("platformName", "iOS");
                
                setCapabilities(desiredCapabilities, caps);

                driver = new IOSDriver<>(new URL(url), caps);
            } else {
                throw new RuntimeException("Failed to instantiate Appium driver. The \"platform\" global argument is missing or is specified incorrectly. Accepted values are \"IOS\" or \"ANDROID\".");
            }

            isInitialized = true;
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Failed to initialize Appium", ex);
        }
    }
    
    public static boolean isPlatform(String platform) {
        return Appium.platform.equalsIgnoreCase(platform.trim());
    }
    
    private static void setCapabilities(Map<String, Object> desiredCapabilities, DesiredCapabilities caps) {
        for (Map.Entry<String, Object> capEntry : desiredCapabilities.entrySet()) {
            caps.setCapability(capEntry.getKey(), capEntry.getValue());
        }
    }
}

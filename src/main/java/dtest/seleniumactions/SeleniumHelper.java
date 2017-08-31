package dtest.seleniumactions;

import java.io.File;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;

public class SeleniumHelper {
    private static WebDriver driver;
    


    public static WebDriver getDriver(){        
        return driver;
    }
            
     public static WebDriver createDriver(String browser, String driverexecutable) {

             File file = new File(driverexecutable);
             
          switch (browser) {
            case "chrome":
                System.setProperty("webdriver.chrome.driver", file.getAbsolutePath());
                SeleniumHelper.driver = new ChromeDriver();                
                SeleniumHelper.driver.manage().window().maximize();
                break;
            case "firefox":
                System.setProperty("webdriver.gecko.driver", file.getAbsolutePath());
                SeleniumHelper.driver = new FirefoxDriver();
                break;
            //TODO: Add support for more browsers
            default:
                throw new RuntimeException(
                        String.format("The \"browser\" argument specifies a browser that is invalid or not supported. The argument value was \"%s\"",
                                browser));
        }
        return driver;
    }
}



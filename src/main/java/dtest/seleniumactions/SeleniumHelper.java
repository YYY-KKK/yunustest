package dtest.seleniumactions;

import java.io.File;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.ie.InternetExplorerDriver;
import org.openqa.selenium.safari.SafariDriver;

public class SeleniumHelper {

    private static WebDriver driver;

    public static WebDriver getDriver() {
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
                SeleniumHelper.driver.manage().window().maximize();
                break;
            case "ie":
                System.setProperty("webdriver.ie.driver", file.getAbsolutePath());
                SeleniumHelper.driver = new InternetExplorerDriver();
                SeleniumHelper.driver.manage().window().maximize();
                break;
            case "safari":
                System.setProperty("webdriver.safari.driver", file.getAbsolutePath());
                SeleniumHelper.driver = new SafariDriver();
                SeleniumHelper.driver.manage().window().maximize();
                break;
            default:
                throw new RuntimeException(
                        String.format("The \"browser\" argument specifies a browser that is invalid or not supported. The argument value was \"%s\"",
                                browser));
        }

        driver.manage().timeouts().setScriptTimeout(20, TimeUnit.SECONDS);
        return driver;
    }
}

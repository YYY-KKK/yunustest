package dtest.mobileactions;

import org.openqa.selenium.By;

public class LaunchApp extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        By locator = readLocatorArgument("locator");
        driver.launchApp();
    }
}

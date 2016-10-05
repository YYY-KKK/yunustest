package dtest.mobileactions;

import org.openqa.selenium.By;

public class CloseApp extends MobileTestAction {

    @Override
    public void run() {
       By locator = readLocatorArgument("locator");
       driver.closeApp();
    }
}

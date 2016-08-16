package dtest.mobileactions;

import org.openqa.selenium.By;

public class SwipeAndTap extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        
        swipeAndFindElement(locator);
        findElement(locator, 1).click();
    }
}

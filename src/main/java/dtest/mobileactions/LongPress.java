/**
 *@Author rajaram.p
 */
package dtest.mobileactions;

import org.openqa.selenium.By;

/**
 *This is action can be used to perform long press on the given element for a specified duration.
 */
public class LongPress extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        Integer pressDuration = readIntArgument("duration", 2000);
        waitForElementPresent(locator,2000);
        longPress(getElement(locator),pressDuration);
        System.out.println("Long Pressed element " + locator.toString());
    }
}
package dtest.mobileactions;

import org.openqa.selenium.By;

public class AssertElementEnabled extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");

        swipeAndCheckElementVisible(locator, swipeDirection);

        //String getState = findElement(locator, 1).getAttribute("enabled");                
        String getState = findElement(locator).getAttribute("clickable");

        if (getState.equalsIgnoreCase("true")) {
            String message = "Element is enabled. " + locator.toString();
            System.out.println(message);
        } else {
            String message = "Element is disabled. " + locator.toString();
            throw new RuntimeException(message);
        }
    }
}

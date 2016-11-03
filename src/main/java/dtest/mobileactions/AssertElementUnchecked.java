package dtest.mobileactions;

import org.openqa.selenium.By;

public class AssertElementUnchecked extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");
                
        swipeAndCheckElementVisible(locator, swipeDirection);

        String getState = findElement(locator, 180).getAttribute("checked");                
        if (getState.equalsIgnoreCase("false")) {
            String message = "Element is unchecked. " + locator.toString();
            System.out.println(message);
        } else {
            String message = "Element is checked. " + locator.toString();
            throw new RuntimeException(message);
        }
    }
}

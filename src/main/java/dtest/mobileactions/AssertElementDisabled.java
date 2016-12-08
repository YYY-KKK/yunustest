package dtest.mobileactions;

import org.openqa.selenium.By;

public class AssertElementDisabled extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");
                
        swipeAndCheckElementVisible(locator, swipeDirection);

        String getEnableState = findElement(locator).getAttribute("enabled");                
        String getClickState = findElement(locator).getAttribute("clickable"); 
        
        if (getEnableState.equalsIgnoreCase("false") || getClickState.equalsIgnoreCase("false")) {
            String message = "Element is disabled. " + locator.toString();
            System.out.println(message);
        } else {
            String message = "Element is enabled. " + locator.toString();
            throw new RuntimeException(message);
        }
    }
}

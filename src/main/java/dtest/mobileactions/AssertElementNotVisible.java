package dtest.mobileactions;

import org.openqa.selenium.By;

public class AssertElementNotVisible extends MobileTestAction {
    
     @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("direction", "none");
        String swipeDirection = readStringArgument("swipe", direction);

        swipeAndCheckElementNotVisible(locator, swipeDirection);
    }
    
}

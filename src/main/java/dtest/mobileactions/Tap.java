package dtest.mobileactions;

import org.openqa.selenium.By;

public class Tap extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("direction", "none");
        String swipeDirection = readStringArgument("swipe", direction);
        
        swipeAndCheckElementVisible(locator, swipeDirection);
        findElement(locator, 1).click();
        System.out.println("Tapped element " + locator.toString());
    }
}

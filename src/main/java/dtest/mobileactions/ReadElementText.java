package dtest.mobileactions;

import org.openqa.selenium.By;

public class ReadElementText extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("direction", "none");
        String swipeDirection = readStringArgument("swipe", direction);
        
        swipeAndCheckElementVisible(locator, swipeDirection);

        String elementText = findElement(locator, 1).getText();
        this.writeOutput("text", elementText);
    }
}

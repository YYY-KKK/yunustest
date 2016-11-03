package dtest.mobileactions;

import org.openqa.selenium.By;

public class AssertElementText extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        String expectedText = readStringArgument("text");
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("direction", "none");
        String swipeDirection = readStringArgument("swipe", direction);

        swipeAndCheckElementVisible(locator, swipeDirection);

        String actualText = findElement(locator, 180).getText();
        if (actualText.contains(expectedText)) {
            String message = "Values are Equal. Expected: " + expectedText + " Actual: " + actualText;
            System.out.println(message);
        } else {
            String message = "Values are Not Equal. Expected: " + expectedText + " Actual: " + actualText;
            throw new RuntimeException(message);
        }
    }
}

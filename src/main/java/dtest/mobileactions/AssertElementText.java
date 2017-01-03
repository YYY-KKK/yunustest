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

        String actualText = getElement(locator).getText();
        if (actualText.contains(expectedText)) {
            System.out.println(String.format("Values are equal. Expected: %s Actual: %s",
                    expectedText,
                    actualText));
        } else {
            throw new RuntimeException(String.format("Values are not equal. Expected: %s Actual: %s",
                    expectedText,
                    actualText));
        }
    }
}

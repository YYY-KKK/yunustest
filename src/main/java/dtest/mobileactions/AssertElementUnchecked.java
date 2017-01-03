package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class AssertElementUnchecked extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");

        swipeAndCheckElementVisible(locator, swipeDirection);

        MobileElement element = getElement(locator);
        //String enabledState = element.getAttribute("enabled");                
        String checkedState = element.getAttribute("checked");

        if (checkedState.equalsIgnoreCase("false")) {
            System.out.println("Element is unchecked: " + locator.toString());
        } else {
            throw new RuntimeException("Element is checked: " + locator.toString());
        }
    }
}

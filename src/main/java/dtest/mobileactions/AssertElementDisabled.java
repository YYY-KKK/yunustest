package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class AssertElementDisabled extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");
                
        swipeAndCheckElementVisible(locator, swipeDirection);

        MobileElement element = getElement(locator);
        String enabledState = element.getAttribute("enabled");                
        String clickableState = element.getAttribute("clickable"); 
        
        if (enabledState.equalsIgnoreCase("false") || clickableState.equalsIgnoreCase("false")) {
            System.out.println("Element is disabled: " + locator.toString());
        } else {
            throw new RuntimeException("Element is enabled: " + locator.toString());
        }
    }
}

package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class AssertElementEnabled extends MobileTestAction {
    
    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");
                
        swipeAndCheckElementVisible(locator, swipeDirection);

        MobileElement element = getElement(locator);
        //String enabledState = element.getAttribute("enabled");                
        String clickableState = element.getAttribute("clickable"); 
        
        if (clickableState.equalsIgnoreCase("true")) {
            System.out.println("Element is enabled: " + locator.toString());
        } else {
            throw new RuntimeException("Element is disabled: " + locator.toString());
        }
    }
}

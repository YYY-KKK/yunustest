package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class AssertElementChecked extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String swipeDirection = readStringArgument("swipe", "none");
                
        swipeAndCheckElementVisible(locator, swipeDirection);

        MobileElement element = getElement(locator);
        //String enabledState = element.getAttribute("enabled");                
        String checkedState = element.getAttribute("checked"); 
        
        if (checkedState.equalsIgnoreCase("true")) {
            System.out.println("Element is checked: " + locator.toString());
        } else {
            throw new RuntimeException("Element is not checked: " + locator.toString());
        }
    }
}

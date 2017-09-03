package dtest.seleniumactions;

import org.openqa.selenium.By;

public class Click extends WebTestAction {
//should implement scroll up and scroll down instead of swipe
    @Override
    public void run() {
        super.run();
        By locator = readLocatorArgument("locator");
        String scrollDirection = readStringArgument("scroll", readStringArgument("direction", "none"));
        
        try{
        
        this.scrollAndCheckElementVisible(locator, scrollDirection);
        this.getElement(locator).click();
        
         } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed clicking on element %s",
                    locator.toString()), ex);
        }
    }
}

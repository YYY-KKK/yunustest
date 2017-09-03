package dtest.seleniumactions;

import dtest.base.logging.Logger;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;

public class ClickAndSwitchToNewWindow extends WebTestAction {
//should implement scroll up and scroll down instead of swipe
    @Override
    public void run() {
        super.run();       
        
        By locator = readLocatorArgument("locator");
        
        try{
    
        this.getElement(locator).click();        
   
        //In case focus needs to switch back to old window
        String winHandleBefore = driver.getWindowHandle();
        
       // Switch to new window opened
        for(String winHandle : driver.getWindowHandles()){
            driver.switchTo().window(winHandle);
        }

        Logger.info("Switched to new browser window");
        
        
         } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed clicking on element %s",
                    locator.toString()), ex);
        }
}
}

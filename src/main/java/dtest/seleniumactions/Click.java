package dtest.seleniumactions;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class Click extends WebTestAction {

    @Override
    public void run() {
        super.run();

        By locator = this.readLocatorArgument("locator");

        WebDriverWait wait = new WebDriverWait(this.driver, 15);
        
        try {
           
            wait.until(ExpectedConditions.elementToBeClickable(locator)); 
            WebElement element = this.getElement(locator);  
            element.click();

        } catch (Exception ex) {
            
            throw new RuntimeException(String.format(
                    "Failed clicking on element %s",
                    locator.toString()), ex);
        }
    }
}

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

        this.waitForAsyncCallsToFinish();
        
        try {            
            WebElement element = this.getElement(locator);
            WebDriverWait wait = new WebDriverWait(this.driver, 15);
            wait.until(ExpectedConditions.elementToBeClickable(element));

            element.click();
        } catch (Exception ex) {

            throw new RuntimeException(String.format(
                    "Failed clicking on element %s",
                    locator.toString()), ex);
        }
    }
}

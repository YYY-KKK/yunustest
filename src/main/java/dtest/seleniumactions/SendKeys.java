package dtest.seleniumactions;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SendKeys extends WebTestAction {

    @Override
    public void run() {
        super.run();

        By locator = this.readLocatorArgument("locator");
        String text = this.readStringArgument("text");
        Boolean clearContent = this.readBooleanArgument("clear", Boolean.FALSE);

        WebDriverWait wait = new WebDriverWait(this.driver, 15);
        
        try {

            wait.until(ExpectedConditions.elementToBeClickable(locator));     
            WebElement element = this.getElement(locator);
            element.click();

            if (clearContent) {
                element.clear();
                element.click();
            }

            element.sendKeys(text);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed sending text \"%s\" to element %s",
                    text,
                    locator.toString()), ex
            );
        }
    }
}

package dtest.seleniumactions;

import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SendKeys extends WebTestAction {

    @Override
    public void run() {
        super.run();

        By locator = this.readLocatorArgument("locator");
        String text = this.readStringArgument("text", null);
        String key = this.readStringArgument("key", null);
        Boolean clearContent = this.readBooleanArgument("clearContent", Boolean.FALSE);
        Boolean sendEnter = this.readBooleanArgument("sendEnter", Boolean.FALSE);

        this.waitForAsyncCallsToFinish();

        try {
            WebElement element = this.getElement(locator);
            WebDriverWait wait = new WebDriverWait(this.driver, 15);
            wait.until(ExpectedConditions.elementToBeClickable(element));

            if (clearContent) {
                element.clear();
            }

            if (text != null) {
                element.sendKeys(text);
            } else if (key != null) {
                element.sendKeys(Keys.valueOf(key));
            } else {
                throw new RuntimeException("Neither the \"text\" argument, nor the \"key\" argument were provided.");
            }

            if (sendEnter) {
                element.sendKeys(Keys.ENTER);
            }
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed sending text \"%s\" to element %s",
                    text != null ? text : key,
                    locator.toString()), ex
            );
        }
    }
}

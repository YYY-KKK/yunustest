package dtest.seleniumactions;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

public class SendKeys extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String text = readStringArgument("text");
        Boolean clearContent = readBooleanArgument("clear", Boolean.FALSE);

        try {
           // swipeAndCheckElementVisible(locator, "down");
            WebElement element = getElement(locator);
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

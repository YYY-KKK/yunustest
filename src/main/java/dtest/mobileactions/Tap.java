package dtest.mobileactions;

import org.openqa.selenium.By;

public class Tap extends MobileTestAction {

    @Override
    public void run() throws Exception {

        By locator;
        String stringId;
        if ((stringId = readStringArgument("xpath", null)) != null) {
            locator = By.xpath(stringId);
        } else if ((stringId = readStringArgument("id", null)) != null) {
            locator = By.id(stringId);
        } else if ((stringId = readStringArgument("text", null)) != null) {
            locator = By.linkText(stringId);
        } else {
            throw new RuntimeException("Provide at least 1 identifier for the object by populating at least 1 of the following arguements: xpath, id, text.");
        }

        try {
            findElement(locator,180).click();
        } catch (Exception ex) {
            String message = String.format("Could not find element identified by: %s", stringId, ex);
            throw new Exception(message);
        }
    }
}

package dtest.mobileactions;

import org.openqa.selenium.By;

public class Tap extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");

        try {
            findElement(locator,180).click();
            String message = String.format("Clicked on the element, located by: %s", locator.toString());
            System.out.println(message);
        } catch (Exception ex) {
            String message = String.format("Could not find the element, located by: %s", locator.toString(), ex);
            throw new Exception(message);
        }
    }
}

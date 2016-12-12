package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class SendKeys extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String inputValue = readStringArgument("text");
        Boolean clearContent = readBooleanArgument("clear", Boolean.FALSE);
        String swipeDirection = readStringArgument("swipe", "none");
        Boolean useKeyboardService = readBooleanArgument("useKeyboardService", Boolean.TRUE);

        try {
            swipeAndCheckElementVisible(locator, swipeDirection);
            MobileElement element = findElement(locator);
            element.click();

            if (clearContent) {
                hideKeyboard();
                element.clear();
                hideKeyboard();
                element.click();
            }
            
            if (useKeyboardService) {
                driver.getKeyboard().sendKeys(inputValue);
            } else {
                element.sendKeys(inputValue);
            }

            if (Appium.isPlatform("android")) {
            hideKeyboard();
            }

            System.out.println(String.format("Entered value \"%s\" on element %s",
                    inputValue,
                    locator.toString()));
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed sending keys to element %s",
                    locator.toString()), ex);
        }
    }
}

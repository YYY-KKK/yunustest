/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.mobileactions;

import org.openqa.selenium.By;

/**
 *
 * @author mc53437
 */
public class ValidateText extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        String expectedText = readStringArgument("text");

        try {
            System.out.println("expectedText : " + expectedText);
            String actualText = findElement(locator, 180).getText();
            System.out.println("actualText : " + actualText);
            if (actualText.equals(expectedText)) {
                String message = "Values are Equal. Expected: " + expectedText + " Actual: " + actualText;
                System.out.println(message);
            } else {
                String message = "Values are Not Equal. Expected: " + expectedText + " Actual: " + actualText;
                throw new Exception(message);
            }
        } catch (Exception ex) {
            String message = String.format("Could not find element identified by: %s", locator.toString(), ex);
            throw new Exception(message);
        }
    }
}

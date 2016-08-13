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
public class SendKeys extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        String inputValue = readStringArgument("text");

        try {
            findElement(locator,180).click();
            hideKeyboard();
            findElement(locator,180).sendKeys(inputValue);            
            hideKeyboard();
            String message = String.format("Entered value-" + inputValue + "-on the element, located by: %s", locator.toString());
        } catch (Exception ex) {
            String message = String.format("Could not find the element, located by: %s", locator.toString(), ex);
            throw new Exception(message, ex);
        }
    }
}

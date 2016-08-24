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
        By locator = readLocatorArgument("locator");
        String inputValue = readStringArgument("text");
        System.out.println("Value to entered : " + inputValue);

        try {
            findElement(locator, 180).click();
            findElement(locator, 180).clear();
            hideKeyboard();
            findElement(locator, 180).sendKeys(inputValue);            
            hideKeyboard();
            String message = String.format("Entered value \"%s\" on element %s",
                    inputValue,
                    locator.toString());
            System.out.println(message);
        } catch (Exception ex) {
            String message = String.format("Could not find element %s",
                    locator.toString(), ex);
            throw new Exception(message, ex);
        }
    }
}

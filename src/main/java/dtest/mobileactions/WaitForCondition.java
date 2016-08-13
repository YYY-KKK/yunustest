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
public class WaitForCondition extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        String condition = readStringArgument("condition");

        boolean isElementExist = waitForElement(locator, condition, 180);

        if (isElementExist) {
            String message = String.format("Found the element located by: %s", locator.toString());
            System.out.println(message);
        } else {
            String message = String.format("Could not find the element located by: %s", locator.toString());
            throw new Exception(message);
        }
    }
}

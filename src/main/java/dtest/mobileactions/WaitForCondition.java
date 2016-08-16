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
        int timeout = readIntArgument("condition", 180);

        System.out.println(String.format("Waiting for condition %s on %s",
                condition,
                locator.toString()));
        
        switch (condition) {
            case "presenceOfElementLocated":
                waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, timeout);
                break;
            case "visibilityOfElementLocated":
                waitForCondition(locator, Condition.VISIBILITY_OF_ELEMENT_LOCATED, timeout);
                break;
        }
    }
}

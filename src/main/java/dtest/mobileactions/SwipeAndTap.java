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
public class SwipeAndTap extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        boolean isElementExist = findElement(locator,60).isDisplayed();
        
        if (!isElementExist){
            isElementExist = swipeAndFindElement(locator);
        }
        if (isElementExist) {
            findElement(locator, 1).click();
        } else {
            String message = String.format("Could not find element identified by: %s", locator.toString());
            throw new Exception(message);
        }
    }
}

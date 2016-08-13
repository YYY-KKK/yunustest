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
public class ValidateImage extends MobileTestAction {

    @Override
    public void run() throws Exception {
        By locator = getLocatorArgument("locator");
        boolean isElementExist = false;
        /*try {
            isElementExist = findElement(locator, 60).isDisplayed();
        } catch (Exception e) {

        }*/

        if (!isElementExist) {
            isElementExist = swipeAndFindElement(locator);
        }
        if (isElementExist) {
            String message = String.format("Image element found");
            System.out.println(message);
        } else {
            String message = String.format("Could not find element by: %s", locator.toString());
            throw new Exception(message);
        }

    }

}

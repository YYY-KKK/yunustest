/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

/**
 *
 * @author mc53437
 */
public class Swipe extends MobileTestAction {

    @Override
    public void run() {
        System.out.println("Inside the action - TouchAndRelease");
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("swipe");
        Boolean pressElement = readBooleanArgument("pressElement", Boolean.TRUE);

        if (pressElement) {
            MobileElement element = findElement(locator, 1);

            if (direction.equalsIgnoreCase("up")) {
                swipeUp(element);
            } else if (direction.equalsIgnoreCase("down")) {
                swipeDown(element);
            } else if (direction.equalsIgnoreCase("left")) {
                swipeLeft(element);
            } else if (direction.equalsIgnoreCase("right")) {
                swipeRight(element);
            }
        } else{
            swipeAndCheckElementVisible(locator, direction);
        }
        
    }
}

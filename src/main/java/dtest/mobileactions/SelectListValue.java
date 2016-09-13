/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.Select;

/**
 *
 * @author mc53437
 */
public class SelectListValue extends MobileTestAction{
    
     @Override
    public void run() {
        By locator = readLocatorArgument("locator");
        String inputValue = readStringArgument("text");

        try {
            MobileElement element = findElement(locator, 180);
            Select dropdown = new Select(element);
            dropdown.selectByVisibleText(inputValue);
                    
            System.out.println(String.format("Selected value \"%s\" on element %s",
                    inputValue,
                    locator.toString()));
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed selecting value in the element %s",
                    locator.toString()), ex);
        }
    }
    
}

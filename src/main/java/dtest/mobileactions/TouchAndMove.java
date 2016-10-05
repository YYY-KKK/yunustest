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
public class TouchAndMove extends MobileTestAction {

    @Override
    public void run() {
        System.out.println("Inside the action - TouchAndRelease");
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("direction");

        MobileElement element = findElement(locator, 1);
        
        if(direction.equalsIgnoreCase("up")){
            swipeUp(element);
        } else if(direction.equalsIgnoreCase("down")) {
            swipeDown(element);
        } else if(direction.equalsIgnoreCase("left")) {
            swipeLeft(element);
        } else if(direction.equalsIgnoreCase("right")) {
            swipeRight(element);
        }
        
    }
    
//    protected void scrollUp(MobileElement element) {
//        Point point = element.getLocation();
//        Dimension size = driver.manage().window().getSize();
//
//        int screenHeight = (int) (size.height * 0.10);
//        int elementY = point.getY();
//
//        int endX = 0;
//        int endY = ((int) screenHeight - elementY);
//
//        TouchAction action = new TouchAction((MobileDriver) driver);
//        action.press(element).moveTo(endX, endY).release().perform();
//
//    }
//
//    protected void scrollDown(MobileElement element) {
//        Point point = element.getLocation();
//        Dimension size = driver.manage().window().getSize();
//
//        int screenHeight = (int) (size.height * 0.90);
//        int elementY = point.getY();
//
//        int endX = 0;
//        int endY = ((int) screenHeight - elementY);
//
//        TouchAction action = new TouchAction((MobileDriver) driver);
//        action.press(element).moveTo(endX, endY).release().perform();
//
//    }
//
//    protected void scrollLeft(MobileElement element) {
//        Point point = element.getLocation();
//        Point p = element.getCenter();
//
//        Dimension size = driver.manage().window().getSize();
//
//        //int screenWidth = (int) (size.width * 0.90);
//        //int elementX = point.getX();
//        int elementX = p.getX();
//
//        int endY = 0;
//        int endX = 0 - elementX + point.getX();
//
//        System.out.println("End X :" + endX);
//
//        TouchAction action = new TouchAction((MobileDriver) driver);
//        action.press(element).moveTo(endX, endY).release().perform();
//
//    }
//
//    protected void scrollRight(MobileElement element) {
//        Point point = element.getLocation();
//        Point p = element.getCenter();
//
//        Dimension size = driver.manage().window().getSize();
//
//        //int screenWidth = (int) (size.width * 0.90);
//        //int elementX = point.getX();
//        int elementX = p.getX();
//
//        int endY = 0;
//        int endX = elementX;
//
//        TouchAction action = new TouchAction((MobileDriver) driver);
//        action.press(element).moveTo(endX, endY).release().perform();
//
//    }
//    

}

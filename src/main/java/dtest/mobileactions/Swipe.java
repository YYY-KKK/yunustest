package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;

public class Swipe extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        System.out.println("Inside the action - TouchAndRelease");
        By locator = readLocatorArgument("locator");
        String direction = readStringArgument("swipe");

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
    }
}

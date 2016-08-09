/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.mobileactions;

import static dtest.mobileactions.MobileTestAction.driver;
import org.openqa.selenium.Dimension;

/**
 *
 * @author mc53437
 */
public class SwipeDown extends MobileTestAction {

    @Override
    public void run() throws Exception {
        swipeVertical("Down");
    }

    private void swipeVertical(String swipeType) throws InterruptedException {

        //Get the size of screen.
        Dimension size;
        size = driver.manage().window().getSize();
        System.out.println(size);

        //Find swipe start and end point from screen's with and height.
        //Find starty point which is at bottom side of screen.
        int starty = (int) (size.height * 0.80);

        //Find endy point which is at top side of screen.
        int endy = (int) (size.height * 0.20);

        //Find horizontal point where you wants to swipe. It is in middle of screen width.
        int startx = size.width / 2;

        //Swipe from Bottom to Top.
        if (swipeType.equalsIgnoreCase("Down")) {
            driver.swipe(startx, starty, startx, endy, 3000);
            Thread.sleep(1000);
        }

        //Swipe from Top to Bottom.
        if (swipeType.equalsIgnoreCase("Up")) {
            driver.swipe(startx, endy, startx, starty, 3000);
            Thread.sleep(1000);
        }
    }
}

package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;
import org.openqa.selenium.Point;

public class ReadElementAspect extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");

        MobileElement element = findElement(locator, 1);
        Point point = element.getLocation();

        int x = point.getX();
        int y = point.getY();

        int width = element.getSize().width;
        int height = element.getSize().height;
        
        System.out.println("x :" + x);
        System.out.println("y :" + y);
        System.out.println("width :" + width);
        System.out.println("height :" + height);

        this.writeOutput("x", x);
        this.writeOutput("y", y);
        this.writeOutput("width", width);
        this.writeOutput("height", height);
    }

}

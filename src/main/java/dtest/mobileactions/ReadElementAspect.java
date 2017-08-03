package dtest.mobileactions;

import dtest.base.logging.Logger;
import io.appium.java_client.MobileElement;
import org.openqa.selenium.By;
import org.openqa.selenium.Point;

public class ReadElementAspect extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");

        MobileElement element = getElement(locator);
        Point point = element.getLocation();

        int x = point.getX();
        int y = point.getY();

        int width = element.getSize().width;
        int height = element.getSize().height;
        
        Logger.trace(String.format("The element aspect is (%s,%s,%s,%s)",
                x, y, width, height));

        this.writeOutput("x", x);
        this.writeOutput("y", y);
        this.writeOutput("width", width);
        this.writeOutput("height", height);
    }

}

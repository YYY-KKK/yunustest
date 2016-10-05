package dtest.mobileactions;

import io.appium.java_client.MobileElement;
import java.util.List;
import org.openqa.selenium.By;

public class VerifyOrder extends MobileTestAction {

    @Override
    public void run() {
//        By locator = readLocatorArgument("locator");
        By locator = By.xpath("//android.widget.TextView[contains(@text,'Name Successfully Changed')]");
        boolean swipeDown = true;
        String lastElement = null;
        String previousElement;
        String getElementText = null;

        while (swipeDown) {
            previousElement = (lastElement != null) ? lastElement : "unset";
            List<MobileElement> allElements = (List<MobileElement>) driver.findElements(By.className("android.widget.TextView"));

            for (int i = 0; i < allElements.size(); i++) {
                getElementText = allElements.get(i).getText().trim();
                if(getElementText.length()>0){
                    System.out.println("Elements name : " + getElementText);
                    lastElement = getElementText;
                }
            }

            if (previousElement.equalsIgnoreCase(lastElement)) {
                System.out.println("Previous Element : " + previousElement);
                System.out.println("Last Element : " + lastElement);
                swipeDown = false;
            } else {
                swipe("down");
                allElements.clear();
            }
        }
    }
}

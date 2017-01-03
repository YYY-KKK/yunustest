package dtest.mobileactions;

import dtest.mobileactions.enums.Condition;
import org.openqa.selenium.By;

public class WaitForCondition extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String condition = readStringArgument("condition");
        int timeout = readIntArgument("timeout", 200);

        System.out.println(String.format("Waiting for condition %s on %s",
                condition,
                locator.toString()));

        switch (condition) {
            case "presenceOfElementLocated":
                try{
                    waitForCondition(locator, Condition.PRESENCE_OF_ELEMENT_LOCATED, timeout);
                    System.out.println("Found element " + locator.toString());
                    break;
                } catch (Exception e) {
                    throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
                }
            case "visibilityOfElementLocated":
                try {
                    waitForCondition(locator, Condition.VISIBILITY_OF_ELEMENT_LOCATED, timeout);
                    System.out.println("Found element " + locator.toString());
                    break;
                } catch (Exception e) {
                    throw new RuntimeException(String.format("Could not find element %s", locator.toString()));
                }
            case "invisibilityOfElementLocated":
                try {
                    waitForCondition(locator, Condition.INVISIBILITY_OF_ELEMENT_LOCATED, timeout);
                    System.out.println("Element not found:" + locator.toString());
                    break;
                } catch (Exception e) {
                    throw new RuntimeException(String.format("Found the element %s", locator.toString()));
                }
        }
    }
}

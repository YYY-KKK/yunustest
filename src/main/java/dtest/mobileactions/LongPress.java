package dtest.mobileactions;

import org.openqa.selenium.By;

/**
 * This is action can be used to perform a long press gesture on a UI element
 * for a specified duration.
 */
public class LongPress extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        By locator = this.readLocatorArgument("locator");
        Integer durationMs = this.readIntArgument("durationMs", this.readIntArgument("duration", 2000));

        this.longPress(getElement(locator), durationMs);
    }
}

package dtest.seleniumactions;

import org.openqa.selenium.By;

/**
 * Launch a browser window to be used for Web UI test automation.
 */
public class SwitchToFrame extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        String frameName = this.readStringArgument("frameName", null);
        String frameIndex = this.readStringArgument("frameIndex", null);
        By locator = this.readLocatorArgument("locator", null);
        
        this.waitForAsyncCallsToFinish();
        
        if (frameName != null) {
            this.driver.switchTo().frame(frameName);
        } else if (frameIndex != null) {
            this.driver.switchTo().frame(frameIndex);
        } else if (locator != null) {
            this.driver.switchTo().frame(this.driver.findElement(locator));
        } else {
            throw new RuntimeException(
                    "You must provide at least one of the following arguments: frameName, frameIndex, locator.");
        }
    }
}

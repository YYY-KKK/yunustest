package dtest.seleniumactions;

import dtest.base.logging.Logger;

public class SwitchToLastWindow extends WebTestAction {

    @Override
    public void run() {
        super.run();

        this.waitForAsyncCallsToFinish();
        
        String[] windowHandles = (String[]) driver.getWindowHandles().toArray();

        try {
            driver.switchTo().window(windowHandles[windowHandles.length - 1]);

            Logger.info(String.format(
                    "Successfully switched to last window (number %s)",
                    windowHandles.length));
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to switch to last window (number %s)",
                    windowHandles.length), ex);
        }
    }
}

package dtest.seleniumactions;

import dtest.base.logging.Logger;

public class SwitchToWindow extends WebTestAction {
//should implement scroll up and scroll down instead of swipe

    @Override
    public void run() {
        super.run();

        Integer windowNumber = this.readIntArgument("windowNumber");
        
        this.waitForAsyncCallsToFinish();
        
        Object[] windowHandles = driver.getWindowHandles().toArray();
         
        try {
            if (windowNumber > windowHandles.length) {
                throw new RuntimeException(String.format(
                    "The specified window number (%s) is greater than the number of windows created (%s).",
                    windowNumber,
                    windowHandles.length));
            }
            
            driver.switchTo().window(windowHandles[windowNumber - 1].toString());

            Logger.info(String.format(
                    "Successfully switched to window number %s",
                    windowNumber));
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to switch to window number %s. The total number of open windows was %s.",
                    windowNumber,
                    windowHandles.length), ex);
        }
    }
}

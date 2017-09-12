package dtest.mobileactions;

import dtest.base.logging.Logger;

public class RunAppInBackground extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        // The argument use to be "seconds", but we're changing it to "durationMs"
        Integer durationMs;
        Integer seconds = this.readIntArgument("seconds", null);
        if (seconds != null) {
            durationMs = seconds * 1000;
            Logger.warning("The \"seconds\" argument of RunAppInBackground action "
                    + "changed to \"durationMs\". Please use the new argument name "
                    + "and don't forget to convert the duration to milliseconds.");
        } else {
            durationMs = this.readIntArgument("durationMs");
        }

        driver.runAppInBackground(durationMs);
        //driver.runAppInBackground(Duration.ofSeconds(durationMs));
    }
}

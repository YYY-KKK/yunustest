package dtest.mobileactions;

public class LaunchApp extends MobileTestAction {

    @Override
    public void run() {
        super.run();

        driver.launchApp();
    }
}

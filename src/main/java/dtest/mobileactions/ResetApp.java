package dtest.mobileactions;

public class ResetApp extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        driver.resetApp();
    }
}

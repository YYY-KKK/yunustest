package dtest.mobileactions;

public class CloseApp extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        driver.closeApp();
    }
}

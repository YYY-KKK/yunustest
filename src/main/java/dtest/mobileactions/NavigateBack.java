package dtest.mobileactions;

public class NavigateBack extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        this.driver.navigate().back();
    }

}

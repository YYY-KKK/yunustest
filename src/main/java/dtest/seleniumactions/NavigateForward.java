package dtest.seleniumactions;

/**
 * Launch a browser window to be used for Web UI test automation.
 */
public class NavigateForward extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        this.driver.navigate().forward();
    }
}

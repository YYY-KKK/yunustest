package dtest.seleniumactions;

public class SwitchToDefaultContent extends WebTestAction {

    @Override
    public void run() {
        super.run();

        try {
            this.driver.switchTo().defaultContent();
        } catch (Exception ex) {
            throw new RuntimeException(
                    "Failed to switch back to the main browser window", ex);
        }
    }
}

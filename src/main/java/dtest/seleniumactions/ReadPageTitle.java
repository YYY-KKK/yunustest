package dtest.seleniumactions;

public class ReadPageTitle extends WebTestAction {

    @Override
    public void run() {
        super.run();

        this.waitForAsyncCallsToFinish();
        
        this.writeOutput("value", driver.getTitle());
    }
}

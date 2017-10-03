package dtest.seleniumactions;

public class ActionsPerform extends WebTestAction {

    @Override
    public void run() {
        super.run();

        if (WebTestAction.actions != null) {
            this.waitForAsyncCallsToFinish();
            
            WebTestAction.actions.build().perform();
        }
    }
}

package dtest.seleniumactions;

import org.openqa.selenium.By;

public class ReadElementText extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = this.readLocatorArgument("locator");
        
        this.waitForAsyncCallsToFinish();
        
        String elementText = this.getElement(locator).getText();
        
        this.writeOutput("value", elementText);
    }
}

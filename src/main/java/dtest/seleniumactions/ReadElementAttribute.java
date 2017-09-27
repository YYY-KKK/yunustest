package dtest.seleniumactions;

import org.openqa.selenium.By;

public class ReadElementAttribute extends WebTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = this.readLocatorArgument("locator");
        String attribute = this.readStringArgument("attribute");
        
        this.waitForAsyncCallsToFinish();
        
        String attributeValue = this.getElement(locator).getAttribute(attribute);
        
        this.writeOutput("value", attributeValue);
    }
}

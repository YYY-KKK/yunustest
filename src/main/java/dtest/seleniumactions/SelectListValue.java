package dtest.seleniumactions;

import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.Select;

public class SelectListValue extends WebTestAction {

    @Override
    public void run() {
        super.run();

        By locator = this.readLocatorArgument("locator");
        String inputValue = this.readStringArgument("text", null);
        Integer index = this.readIntArgument("index", null);

        this.waitForAngulartoFinish();

        driver.findElement(locator).click();
        Select dropdown = new Select(driver.findElement(locator));
        if (inputValue != null) {
            dropdown.selectByValue(inputValue);
        } else if (index != null) {
            dropdown.selectByIndex(index);
        } else {
            throw new RuntimeException(String.format("Failed selecting value in the select list %s",
                    locator.toString()));
        }

    }

}

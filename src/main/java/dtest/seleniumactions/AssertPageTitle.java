package dtest.seleniumactions;

import java.util.logging.Level;
import java.util.logging.Logger;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class AssertPageTitle extends WebTestAction {

    @Override
    public void run() {

            super.run();
            
            String expectedText = readStringArgument("expectedtext");
            
            WebDriverWait wait = new WebDriverWait(driver, 15);
            wait.until(ExpectedConditions.titleContains(driver.getTitle()));

            
            String actualText = driver.getTitle();
            
            if (actualText.equalsIgnoreCase(expectedText)) {
                System.out.println(String.format("Values are equal. Expected: %s Actual: %s",
                        expectedText,
                        actualText));
            } else {
                throw new RuntimeException(String.format("Values are not equal. Expected: %s Actual: %s",
                        expectedText,
                        actualText));
            }
    }
}

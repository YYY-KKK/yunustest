package dtest.mobileactions;

import java.util.Set;
import org.openqa.selenium.By;

public class SwitchContext extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        String context = readStringArgument("context");
        try {
            driver.context(context);
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed switching context to %s",
                    context), ex);
        }
    }
}

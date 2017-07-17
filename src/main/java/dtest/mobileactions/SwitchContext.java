package dtest.mobileactions;

import java.util.Set;
import org.apache.commons.lang3.StringUtils;

public class SwitchContext extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        String context = this.readStringArgument("context");
        try {
            this.driver.context(context);
        } catch (Exception ex) {
            Set<String> contexts = this.driver.getContextHandles();
            throw new RuntimeException(String.format("Failed switching context to %s. The available contexts were %s.",
                    context,
                    StringUtils.join(contexts, ", ")), ex);
        }
    }
}

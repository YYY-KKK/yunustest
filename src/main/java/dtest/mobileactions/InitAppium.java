package dtest.mobileactions;

import dtest.base.TestAction;

public class InitAppium extends TestAction {

    @Override
    public void run() throws Exception {
        String platform = readStringArgument("platform");
        String url = readStringArgument("url");
        Boolean resetDriver = readBooleanArgument("resetDriver", false);
        
        Appium.initialize(platform, url, resetDriver);
    }
}

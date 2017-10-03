package dtest.seleniumactions;

import java.util.concurrent.TimeUnit;
import org.openqa.selenium.JavascriptExecutor;

public class ExecuteScript extends WebTestAction{

    @Override
    public void run() {
        super.run();

        String script = this.readStringArgument("script");
        Boolean async = this.readBooleanArgument("async", false);
        Integer timeoutSec = this.readIntArgument("timeoutSec", 20);

        this.waitForAsyncCallsToFinish();
        
        driver.manage().timeouts().setScriptTimeout(timeoutSec, TimeUnit.SECONDS);	
        JavascriptExecutor jsExecutor = (JavascriptExecutor)driver;
        if (async) {
            jsExecutor.executeAsyncScript(script);
        } else {
            jsExecutor.executeScript(script);
        }
    }
}   

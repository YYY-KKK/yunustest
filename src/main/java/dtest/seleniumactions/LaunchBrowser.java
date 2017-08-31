package dtest.seleniumactions;

import com.sun.media.jfxmedia.logging.Logger;
import java.io.File;
import org.eclipse.jetty.util.log.Log;

/**
 * Launch a browser window to be used for Web UI test automation.
 */
public class LaunchBrowser extends WebTestAction{

    @Override
    public void run() {
        super.run();

      
        String browser = this.readStringArgument("browser");
        String driverExecutable = this.readStringArgument("driverExecutable");
    

             this.driver = SeleniumHelper.createDriver(browser.trim().toLowerCase(), driverExecutable.trim().toLowerCase());
    }
}   

package dtest.seleniumactions;

public class CloseBrowser extends WebTestAction{   

    @Override
    public void run() {
        super.run();
        
        driver.close();
        driver.quit();
    }
}

package dtest.mobileactions;

import org.openqa.selenium.By;

public class SelectListValue extends MobileTestAction {

    @Override
    public void run() {
        super.run();
        
        By locator = readLocatorArgument("locator");
        String inputValue = readStringArgument("text");

        try {
            //MobileElement element = findElement(locator, 180);
            /*Select dropdown = new Select(element);

            List droplist = dropdown.getOptions();
            for (int i = 0; i < droplist.size(); i++) {
                MobileElement listItem = (MobileElement) droplist.get(i);
                System.out.println(listItem.getText());
            }*/
            
            selectDropDownValue(locator);

            System.out.println(String.format("Selected value \"%s\" on element %s",
                    inputValue,
                    locator.toString()));
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed selecting value in the element %s",
                    locator.toString()), ex);
        }
    }

}

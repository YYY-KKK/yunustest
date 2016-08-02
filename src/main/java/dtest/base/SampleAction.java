package dtest.base;

import java.util.Map;
import java.util.function.BiConsumer;

/**
 * Sample action implementation.
 */
public class SampleAction extends TestAction {
    
    private Integer mandatoryIntArgument;
    
    private String mandatoryStrArgument;
    
    @Override
    public void run() {
        // Parse arguments and store their values using private fields of the
        // action class. We do this for clarity, among other reasons.
        mandatoryIntArgument = this.readIntArgument("mandatoryIntArgument");
        mandatoryStrArgument = this.readArgument("mandatoryStrArgument").toString();
        
        System.out.println("mandatoryIntArgument = " + Integer.toString(mandatoryIntArgument));
        System.out.println("mandatoryStrArgument = " + mandatoryStrArgument);
        this.writeOutput("someIntegerOutput", Integer.toString(mandatoryIntArgument + 1));
    }
    
}

package dtest.actor;

import java.util.Map;

/**
 * Stores summary information about a test action that will be sent to the
 * sync server to be used for reporting.
 */
public class TestActionInfo {

    public String action;
    
    public String actorType;

    public Map<String, Object> args;

    public String description;

    public int duration;

    public String macro;
    
    public String result;
    
    public int step;
}

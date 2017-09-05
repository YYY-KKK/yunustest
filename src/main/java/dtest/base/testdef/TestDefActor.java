package dtest.base.testdef;

import java.util.List;
import java.util.Map;

/**
 * Represents an actor section in a test definition file.
 */
public class TestDefActor {
    public String actor;
    
    /** Alternative name for the "actor" property. */
    public String actorType;
    
    public String description;
    
    public Map<String, Object> globalArgs;
    
    public List<TestDefStep> steps;
}

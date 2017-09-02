package dtest.actor;

import dtest.base.TestAction;
import java.util.HashMap;
import java.util.Map;
import java.util.function.BiConsumer;

/**
 * Represents the action that corresponds to the "script" node in an actions
 * list.
 */
public class ScriptAction extends TestAction {

    private TestActor actor;

    private String script;

    public ScriptAction(TestActor actor, String script) {
        this.actor = actor;
        this.script = script;
    }

    @Override
    public void run() {
        Map<String, Object> scriptOutput = new HashMap<>();
        actor.injectVariable("$writeOutput", new BiConsumer<String, Object>() {
            @Override
            public void accept(String outputName, Object outputValue) {
                scriptOutput.put(outputName, outputValue);
            }
        });
        
        actor.evalScript(script);
        
        for (Map.Entry<String, Object> entry : scriptOutput.entrySet()) {
            this.writeOutput(entry.getKey(), entry.getValue());
        }
    }
}

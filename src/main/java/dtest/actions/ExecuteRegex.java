package dtest.actions;

import dtest.base.TestAction;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * An action that executes a regular expression against the specified text.
 */
public class ExecuteRegex extends TestAction {

    @Override
    public void run() {
        super.run();

        String text = this.readStringArgument("text");
        String regex = this.readStringArgument("regex");
        boolean caseInsensitive = this.readBooleanArgument("caseInsensitive", false);
        boolean dotallMode = this.readBooleanArgument("dotallMode", false);
        boolean global = this.readBooleanArgument("global", false);
        boolean multiline = this.readBooleanArgument("multiline", false);

        int regexFlags = 0;
        if (caseInsensitive) {
            regexFlags |= Pattern.CASE_INSENSITIVE;
        }
        if (dotallMode) {
            regexFlags |= Pattern.DOTALL;
        }
        if (multiline) {
            regexFlags |= Pattern.MULTILINE;
        }

        Pattern pattern = Pattern.compile(regex, regexFlags);
        Matcher matcher = pattern.matcher(text);

        if (!global) {
            if (matcher.find()) {
                this.writeOutput("fullMatch", matcher.group(0));
                
                // Publish one output value per each capture group with names like
                // "group1", "group2", etc. The value "group0" represents the whole
                // text that was matched.
                for (int groupNumber = 0; groupNumber <= matcher.groupCount(); groupNumber++) {
                    this.writeOutput(String.format("group%d", groupNumber), matcher.group(groupNumber));
                }
            } else {
                throw new RuntimeException("The regular expression didn't match the specified text.");
            }
        } else {
            List<Map<String, String>> matches = new ArrayList<>();
            
            while (matcher.find()) {
                Map<String, String> match = new HashMap<>();
                match.put("fullMatch", matcher.group(0));
                
                for (int groupNumber = 0; groupNumber <= matcher.groupCount(); groupNumber++) {
                    match.put(String.format("group%d", groupNumber), matcher.group(groupNumber));
                }
                
                matches.add(match);
            }
            
            if (matches.size() == 0) {
                throw new RuntimeException("The regular expression didn't match the specified text.");
            }
            
            this.writeOutput("matches", matches);
        }

        this.writeOutput("isFullMatch", matcher.hitEnd());
    }
}

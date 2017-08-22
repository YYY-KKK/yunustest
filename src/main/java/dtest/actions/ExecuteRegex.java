package dtest.actions;

import dtest.base.TestAction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * An action that executes a regular expression against the specified text.
 */
public class ExecuteRegex extends TestAction {

    @Override
    public void run() {
        super.run();

        String text = readStringArgument("text");
        String regex = readStringArgument("regex");
        boolean caseInsensitive = readBooleanArgument("caseInsensitive", false);
        boolean dotallMode = readBooleanArgument("dotallMode", false);
        boolean multiline = readBooleanArgument("multiline", false);
        
        int regexFlags = 0;
        if (caseInsensitive) { regexFlags |= Pattern.CASE_INSENSITIVE; }
        if (dotallMode) { regexFlags |= Pattern.DOTALL; }
        if (multiline) { regexFlags |= Pattern.MULTILINE; }
        
        Pattern pattern = Pattern.compile(regex, regexFlags);
        Matcher matcher = pattern.matcher(text);
        boolean isMatch = matcher.matches();
        
        this.writeOutput("isMatch", isMatch);
        
        if (isMatch) {
            // Publish one output value per each capture group with names like
            // "group1", "group2", etc. The value "group0" represents the whole
            // text that was matched.
            for (int groupNumber = 0; groupNumber <= matcher.groupCount(); groupNumber++) {
                this.writeOutput(String.format("group%d", groupNumber), matcher.group(groupNumber));
            }
        } else {
            throw new RuntimeException("The regular expression didn't match the specified text.");
        }
    }
}

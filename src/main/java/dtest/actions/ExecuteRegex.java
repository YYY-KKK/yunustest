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
        
        int regexFlages = 0;
        if (caseInsensitive) { regexFlages |= Pattern.CASE_INSENSITIVE; }
        if (dotallMode) { regexFlages |= Pattern.DOTALL; }
        if (multiline) { regexFlages |= Pattern.MULTILINE; }
        
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        boolean matches = matcher.matches();
        if (matches) {
            for (int groupNumber = 0; groupNumber <= matcher.groupCount(); groupNumber++) {
                this.writeOutput(String.format("group%d", groupNumber), matcher.group(groupNumber));
            }
        }
        this.writeOutput("isMatch", matches);
    }
}

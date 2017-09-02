package dtest.actions;

import java.util.List;
import java.util.Map;
import static org.testng.Assert.*;
import org.testng.annotations.Test;

public class ExecuteRegexNGTest {

    @Test
    public void testBasicRegex() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use including the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "^.*(d.*y).*?(\\d+).*");
        executeRegex.run();

        assertEquals(executeRegex.readOutputValue("fullMatch"), text);
        assertEquals(executeRegex.readOutputValue("group0"), text);
        assertEquals(executeRegex.readOutputValue("group1"), "dummy");
        assertEquals(executeRegex.readOutputValue("group2"), "123");
        assertEquals(executeRegex.readOutputValue("isFullMatch"), true);
    }

    @Test
    public void testFullMatchNegative() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "Some");
        executeRegex.run();

        assertEquals(executeRegex.readOutputValue("isFullMatch"), false);
    }

    @Test
    public void testCaseInsensitiveRegex() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use including the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "^.*(D.*y).*?(\\d+).*");
        executeRegex.writeArgument("caseInsensitive", true);
        executeRegex.run();

        assertEquals(executeRegex.readOutputValue("group0"), text);
        assertEquals(executeRegex.readOutputValue("group1"), "dummy");
        assertEquals(executeRegex.readOutputValue("group2"), "123");
    }

    @Test
    public void testCaseInsensitiveRegexNegative() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use including the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "^.*(D.*y).*?(\\d+).*");

        try {
            executeRegex.run();
            fail("No exception was thrown while using non-matching regex");
        } catch (Exception ex) {
        }
    }

    @Test
    public void testDotAllMode() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use,\nincluding the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "^.*(d.*y).*?(\\d+).*");
        executeRegex.writeArgument("dotallMode", true);
        executeRegex.run();

        assertEquals(executeRegex.readOutputValue("group0"), text);
        assertEquals(executeRegex.readOutputValue("group1"), "dummy");
        assertEquals(executeRegex.readOutputValue("group2"), "123");
    }

    @Test
    public void testDotAllModeNegative() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use,\nincluding the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "^.*(d.*y).*?(\\d+).*");
        try {
            executeRegex.run();
            fail("No exception was thrown while using non-matching regex");
        } catch (Exception ex) {
        }
    }

    @Test
    public void testGlobalMode() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "===Mike,32;Sidney,29===";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "(\\w+),(\\d+)");
        executeRegex.writeArgument("global", true);
        executeRegex.run();

        assertEquals(executeRegex.hasOutput("matches"), Boolean.TRUE);
        List<Map<String, String>> matches = (List) executeRegex.readOutputValue("matches");

        assertEquals(matches.get(0).get("fullMatch"), "Mike,32");
        assertEquals(matches.get(0).get("group1"), "Mike");
        assertEquals(matches.get(0).get("group2"), "32");

        assertEquals(matches.get(1).get("fullMatch"), "Sidney,29");
        assertEquals(matches.get(1).get("group1"), "Sidney");
        assertEquals(matches.get(1).get("group2"), "29");
    }

    @Test
    public void testGlobalModeNegative() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Mike,32;Sidney,29";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", "(\\w+)!(\\d+)");
        executeRegex.writeArgument("global", true);

        try {
            executeRegex.run();
            fail("No exception was thrown while using non-matching regex");
        } catch (Exception ex) {
        }
    }

    @Test
    public void testMultiline() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use,\nincluding the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", ".*^(i.*?g).*");
        executeRegex.writeArgument("multiline", true);
        executeRegex.run();

        assertEquals(executeRegex.readOutputValue("group0"), "including the number 123.");
        assertEquals(executeRegex.readOutputValue("group1"), "including");
    }

    @Test
    public void testMultilineNegative() {
        ExecuteRegex executeRegex = new ExecuteRegex();
        String text = "Some dummy text to use,\nincluding the number 123.";
        executeRegex.writeArgument("text", text);
        executeRegex.writeArgument("regex", ".*^(i.*?g).*");
        try {
            executeRegex.run();
            fail("No exception was thrown while using non-matching regex");
        } catch (Exception ex) {
        }
    }
}

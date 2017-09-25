package dtest.base.util;

import java.util.regex.Matcher;
import static org.testng.Assert.*;
import org.testng.annotations.Test;

public class StringUtilNGTest {

    @Test
    public void testExecuteRegex() {
        String text = "prefix-content-suffix";
        Matcher matcher = StringUtil.executeRegex(text, "^(.+)-(.+)-(.+)$");
        assertEquals(matcher.groupCount(), 3);
        assertEquals(matcher.group(1), "prefix");
        assertEquals(matcher.group(2), "content");
        assertEquals(matcher.group(3), "suffix");
    }

    @Test
    public void testSubstringByRegexWithGroup() {
        String text = "prefix-content-suffix";
        String prefix = StringUtil.substringByRegex(text, "^([^-]+)");
        assertEquals(prefix, "prefix");
    }
    
    @Test
    public void testSubstringByRegexWithoutGroup() {
        String text = "prefix-content-suffix";
        String prefix = StringUtil.substringByRegex(text, "^[^-]+");
        assertEquals(prefix, "prefix");
    }
}

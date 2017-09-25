package dtest.base.util;

import static org.testng.Assert.*;
import org.testng.annotations.Test;

public class ConfigNGTest {

    public ConfigNGTest() {
    }

    @Test
    public void testGetExistingProperty() {
        Config config = new Config();
        config.set("something", 123);
        assertEquals(config.get("something"), 123);
    }

    @Test
    public void testGetMissingProperty() {
        try {
            Config config = new Config();
            assertEquals(config.get("something"), null);

            fail("No exception was thrown while attempting to read a non-existing property");
        } catch (Exception ex) {
        }
    }

    @Test
    public void testGetMissingStringPropertyWithNullDefault() {
        try {
            Config config = new Config();
            config.getString("something");

            fail("No exception was thrown while attempting to read a non-existing property");
        } catch (Exception ex) {
        }
    }

    @Test
    public void testLoadPropertiesFile() {
        Config config = Config.load("sample.properties");
        assertEquals(config.get("actorType").getClass(), String.class);
    }

    @Test
    public void testLoadYamlFile() {
        Config config = Config.load("sample.yaml");;
        assertEquals(config.get("actorType").getClass(), String.class);
    }

    @Test
    public void testReadMultiLevelPropertyPositive() {
        Config config = Config.loadYaml("prop1: { prop2: { prop3: 123 } }");
        assertEquals(config.get("prop1.prop2.prop3"), 123);
    }

    @Test
    public void testReadMultiLevelPropertyNegative() {

        try {
            Config config = Config.loadYaml("prop1: { prop2: { prop3: 123 } }");
            config.get("prop1.prop2.prop3.prop4");

            fail("No exception was thrown while attempting to read a non-existing property");
        } catch (Exception ex) {
            assertTrue(ex.getCause().getMessage().contains("prop4"));
        }
    }
}

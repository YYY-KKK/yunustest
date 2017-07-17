package dtest.base;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import static org.testng.Assert.*;
import org.testng.annotations.Test;

public class TestActionNGTest {

    /**
     * Test of getArgNames method, of class TestAction.
     */
//    @Test
//    public void testGetArgNames() {
//        System.out.println("getArgNames");
//        TestAction instance = new TestActionImpl();
//        String[] expResult = null;
//        String[] result = instance.getArgNames();
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of getArgs method, of class TestAction.
     */
//    @Test
//    public void testGetArgs() {
//        System.out.println("getArgs");
//        TestAction instance = new TestActionImpl();
//        Map expResult = null;
//        Map result = instance.getArgs();
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of getOutput method, of class TestAction.
     */
//    @Test
//    public void testGetOutput() {
//        System.out.println("getOutput");
//        TestAction instance = new TestActionImpl();
//        Map expResult = null;
//        Map result = instance.getOutput();
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of getSession method, of class TestAction.
     */
//    @Test
//    public void testGetSession() {
//        System.out.println("getSession");
//        TestAction instance = new TestActionImpl();
//        TestSessionStatus expResult = null;
//        TestSessionStatus result = instance.getSession();
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of hasArgument method, of class TestAction.
     */
//    @Test
//    public void testHasArgument() {
//        System.out.println("hasArgument");
//        String argName = "";
//        TestAction instance = new TestActionImpl();
//        Boolean expResult = null;
//        Boolean result = instance.hasArgument(argName);
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of hasOutput method, of class TestAction.
     */
//    @Test
//    public void testHasOutput() {
//        System.out.println("hasOutput");
//        String key = "";
//        TestAction instance = new TestActionImpl();
//        Boolean expResult = null;
//        Boolean result = instance.hasOutput(key);
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of initialize method, of class TestAction.
     */
//    @Test
//    public void testInitialize() {
//        System.out.println("initialize");
//        TestAction instance = new TestActionImpl();
//        instance.initialize();
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    /**
     * Test of isOptional method, of class TestAction.
     */
//    @Test
//    public void testIsOptional() {
//        System.out.println("isOptional");
//        TestAction instance = new TestActionImpl();
//        boolean expResult = false;
//        boolean result = instance.isOptional();
//        assertEquals(result, expResult);
//        // TODO review the generated test code and remove the default call to fail.
//        fail("The test case is a prototype.");
//    }
    
    /**
     * TestAction.readArgument with default value.
     */
    @Test
    public void testReadArgument_String_Object() {
        TestAction instance = new TestActionImpl();
        Object argValue = new Object();
        Object result1 = instance.readArgument("arg1", argValue);
        Object result2 = instance.readArgument("arg2", null);
        Object result3 = instance.readArgument("arg3", "val2");

        assertTrue(result1 == argValue);
        assertTrue(result2 == null);
        assertTrue(result3.equals("val2"));
    }

    /**
     * TestAction.readArgument with NO default value.
     */
    @Test
    public void testReadArgument_String() {
        TestAction instance = new TestActionImpl();
        Object argValue = new Object();
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Object result = instance.readArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }

    /**
     * TestAction.readArrayArgument with default value.
     */
    @Test
    public void testReadArrayArgument_String_ArrayList() {
        TestAction instance = new TestActionImpl();
        
        ArrayList<Object> argValue = new ArrayList<Object>();
        Object result1 = instance.readArrayArgument("arg1", argValue);
        Object result2 = instance.readArgument("arg2", null);

        assertTrue(result1 == argValue);
        assertTrue(result2 == null);
    }

    /**
     * TestAction.readArrayArgument with NO default value.
     */
    @Test
    public void testReadArrayArgument_String() {
        TestAction instance = new TestActionImpl();
        ArrayList<Object> argValue = new ArrayList<Object>();
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Object result = instance.readArrayArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readArrayArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }

    /**
     * TestAction.readDoubleArgument with default value.
     */
    @Test
    public void testReadDoubleArgument_String_Double() {
        TestAction instance = new TestActionImpl();
        Double result1 = instance.readDoubleArgument("arg1", 1.5);
        Double result2 = instance.readDoubleArgument("arg2", null);

        assertTrue(result1 == 1.5);
        assertTrue(result2 == null);
    }

    /**
     * TestAction.readDoubleArgument with NO default value.
     */
    @Test
    public void testReadDoubleArgument_String() {
        TestAction instance = new TestActionImpl();
        Double argValue = 1.5;
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Double result = instance.readDoubleArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readDoubleArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }

    /**
     * TestAction.readIntArgument with default value.
     */
    @Test
    public void testReadIntArgument_String_Integer() {
        TestAction instance = new TestActionImpl();
        Integer result1 = instance.readIntArgument("arg1", 1);
        Integer result2 = instance.readIntArgument("arg2", null);

        assertTrue(result1 == 1);
        assertTrue(result2 == null);
    }

    /**
     * TestAction.readIntArgument with NO default value.
     */
    @Test
    public void testReadIntArgument_String() {
        TestAction instance = new TestActionImpl();
        Integer argValue = 1;
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Integer result = instance.readIntArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readDoubleArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }

    /**
     * TestAction.readMapArgument with default value.
     */
    @Test
    public void testReadMapArgument_String_Map() {
        Map<String, Object> argValue = new HashMap<>();
        
        TestAction instance = new TestActionImpl();
        Map<String, Object> result1 = instance.readMapArgument("arg1", argValue);
        Map<String, Object> result2 = instance.readMapArgument("arg2", null);

        assertTrue(result1 == argValue);
        assertTrue(result2 == null);
    }
    
    /**
     * TestAction.readMapArgument with NO default value.
     */
    @Test
    public void testReadMapArgument_String() {
        TestAction instance = new TestActionImpl();
        Map<String, Object> argValue = new HashMap<>();
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Map<String, Object> result = instance.readMapArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readMapArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }
    
    /**
     * TestAction.readBooleanArgument with default value.
     */
    @Test
    public void testReadBooleanArgument_String_Boolean() {
        TestAction instance = new TestActionImpl();
        Boolean result1 = instance.readBooleanArgument("arg1", true);
        Boolean result2 = instance.readBooleanArgument("arg2", null);

        assertTrue(result1 == true);
        assertTrue(result2 == null);
    }

    /**
     * TestAction.readDoubleArgument with NO default value.
     */
    @Test
    public void testReadBooleanArgument_String() {
        TestAction instance = new TestActionImpl();
        Boolean argValue = true;
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        Boolean result = instance.readBooleanArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readBooleanArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }
    
    /**
     * TestAction.readStringArgument with default value.
     */
    @Test
    public void testReadStringArgument_String_String() {
        TestAction instance = new TestActionImpl();
        String result1 = instance.readStringArgument("arg1", "value1");
        String result2 = instance.readStringArgument("arg2", null);

        assertEquals(result1, "value1");
        assertEquals(result2, null);
    }

    /**
     * TestAction.readStringArgument with NO default value.
     */
    @Test
    public void testReadStringArgument_String() {
        TestAction instance = new TestActionImpl();
        String argValue = "value1";
        
        // Test reading an existing argument
        instance.writeArgument("arg1", argValue);
        String result = instance.readStringArgument("arg1");
        assertEquals(result, argValue);

        // Test reading a missing argument
        try {
            instance.readStringArgument("arg2");
            fail("No exception was thrown when reading non-existent argument");
        } catch (Exception ex) {
            assertTrue(ex.getMessage().contains("Mandatory argument"));
        }
    }

    /**
     * Test of readOutputValue method, of class TestAction.
     */
    @Test
    public void testReadOutputValue() {
        TestAction instance = new TestActionImpl();
        instance.writeOutput("output1", "value1");
        Object result = instance.readOutputValue("output1");
        assertEquals(result, "value1");
    }
    
    /**
     * Test of setSession method, of class TestAction.
     */
    @Test
    public void testSetSession() {
        TestSessionStatus session = new TestSessionStatus("123");
        TestAction instance = new TestActionImpl();
        instance.setSession(session);
        assertEquals(session, instance.getSession());
    }

    public class TestActionImpl extends TestAction {
    }
}

package dtest.base;

import com.google.gson.Gson;
import dtest.base.contracts.ILogger;
import dtest.base.exceptions.ArgumentException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/** Base class for all test actions. Derived classes must override the "run"
 * method and make sure to call the base class implementation of the method
 * using the super.run() syntax on the first line.
 */
public abstract class TestAction {

    private Map<String, Object> args;

    /** If set to false, the test action will not execute. Useful when test actions 
     * need to be executed conditionally based on test session parameter values */
    private boolean executeIf;
    
    /** If set to true, a failure in this action will not cause the test to
     * fail. Instead, execution will resume as if the action had succeeded. */
    private boolean optional;
            
    /**
     * At runtime, this field will be populated with a reference to the test
     * actor's logger. The text written to this logger is sent both to the
     * console and to the sync service via HTTP.
     */
    protected ILogger log;

    private Map<String, Object> out;

    private TestSession session;

    /**
     * Returns the current list of argument names.
     *
     * @return
     */
    public String[] getArgNames() {
        if (args == null) {
            return new String[0];
        }

        Set<String> keySet = args.keySet();
        return keySet.toArray(new String[keySet.size()]);
    }
    
    /**
     * Returns the arguments for this action, as a Map.
     */
    public Map<String, Object> getArgs() {
        if (this.args == null) {
            return new HashMap<String, Object>();
        } else {
            return new HashMap<String, Object>(this.args);
        }
    }

    /**
     * Returns the output values for this action, as a Map.
     */
    public Map<String, Object> getOutput() {
        if (out == null) {
            return new HashMap<String, Object>();
        } else {
            return new HashMap<String, Object>(out);
        }
    }

    public TestSession getSession() {
        return session;
    }

    /**
     * Returns true if the argument with the specified key exists and false
     * otherwise.
     *
     * @param argName The argument name to check for
     * @return
     */
    public Boolean hasArgument(String argName) {
        return args != null && args.get(argName) != null;
    }

    /**
     * Returns true if the output value with the specified key exists and false
     * otherwise.
     *
     * @param key The output key name to check for
     * @return
     */
    public Boolean hasOutput(String key) {
        return out != null && out.containsKey(key);
    }

    /**
     * This method is called just before the action is run, but after the action
     * arguments are populated. Derived classes can override it whenever they
     * need to run initialization logic.
     */
    public void initialize() {
    }

    /** Return a value that shows whether a failure in this action will cause
     * the whole test to fail. If false is returned, when this action fails
     * execution will resume as if the action had succeeded. */
    public boolean isOptional() {
        return optional;
    }
    
    /**
     * Reads the argument value for the key specified, as a double.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public double readDoubleArgument(String argName, Double defaultValue) {
        // Keeping the following line outside of the try/catch allows for a more
        // logical/useful error message when the argument is missing from the
        // test definition
        String argValue = readArgument(argName, defaultValue).toString();

        try {
            return Double.parseDouble(argValue);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as a double",
                    argName), ex);
        }
    }

    /**
     * Reads the argument value for the key specified, as a double.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public double readDoubleArgument(String argName) {
        return readDoubleArgument(argName, null);
    }
    
    /**
     * Reads the argument value for the key specified, as an integer.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Integer readIntArgument(String argName, Integer defaultValue) {
        // Keeping the following line outside of the try/catch allows for a more
        // logical/useful error message when the argument is missing from the
        // test definition
        String argValue = readArgument(argName, defaultValue).toString();

        try {
            // We pase as double to avoid errors when parsing values like "1.0"
            return (int) Double.parseDouble(argValue);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as an integer",
                    argName), ex);
        }
    }

    /**
     * Reads the argument value for the key specified, as an integer.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public Integer readIntArgument(String argName) {
        return readIntArgument(argName, null);
    }

    /**
     * Reads the argument value for the key specified, as a Map.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Map<String, Object> readMapArgument(String argName, Map<String, Object> defaultValue) {
        // Keeping the following line outside of the try/catch allows for a more
        // logical/useful error message when the argument is missing from the
        // test definition
        Object argValue = readArgument(argName, defaultValue);
        if (argValue instanceof String) {
            // This code should not normally be reached, since map arguments are passed
            // in as maps already by the test actor. This is just a precaution.
            Gson gson = new Gson();
            Map<String,Object> map = new HashMap<String,Object>();
            argValue = gson.fromJson(argName, map.getClass());
        }

        try {
            return (Map<String, Object>) argValue;
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as an Map",
                    argName), ex);
        }
    }

    /**
     * Reads the argument value for the key specified, as a Map.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public Map<String, Object> readMapArgument(String argName) {
        return readMapArgument(argName, null);
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Object readArgument(String argName, Object defaultValue) {
        if (this.hasArgument(argName)) {
            return args.get(argName);
        } else if (defaultValue != null) {
            return defaultValue;
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public Object readArgument(String argName) {
        return readArgument(argName, null);
    }

    /**
     * Reads the argument value for the key specified, as a Boolean.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Boolean readBooleanArgument(String argName, Boolean defaultValue) {
        Object objValue = readArgument(argName, defaultValue);
        if (objValue instanceof Boolean) {
            return (Boolean)objValue;
        }
        
        String argValue = objValue.toString().toLowerCase();
        switch(argValue) {
            case "true":
            case "1":
            case "yes":
                return true;
            case "false":
            case "0":
            case "no":
                return false;
            default:
                throw new RuntimeException(String.format(
                        "Failed to parse value %s as a boolean",
                        argValue));
        }
    }

    /**
     * Reads the argument value for the key specified, as a Boolean.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public Boolean readBooleanArgument(String argName) {
        return readBooleanArgument(argName, null);
    }

    /**
     * Reads the output value for the key specified
     *
     * @param key The key whose value will be returned
     * @return
     */
    public Object readOutputValue(String key) {
        if (out == null) {
            return null;
        } else {
            return out.get(key);
        }
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public String readStringArgument(String argName, String defaultValue) {
        return readArgument(argName, defaultValue).toString();
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public String readStringArgument(String argName) {
        return readStringArgument(argName, null);
    }

    public void setSession(TestSession session) {
        // Session can only be set once
        if (this.session == null) {
            this.session = session;
        } else {
            throw new RuntimeException("An attempt was made to update the test action session. The session can only be set once");
        }
    }

    /**
     * This method is called by the test actor to take screenshots that are
     * relevant for the current execution context and can be used to troubleshoot
     * failed tests. Derived classes can override it as necessary. The screenshots
     * need to be in PNG format.
     */
    public java.io.InputStream takeScreenshot() {
        return null;
    }
    
    public void writeArgument(String key, Object value) {
        if (args == null) {
            args = new HashMap<>();
        }

        args.put(key, value);
    }

    /**
     * Writes an output value for the current this.action.
     *
     * @param key
     * @param value
     */
    protected void writeOutput(String key, Object value) {
        if (out == null) {
            out = new HashMap<>();
        }

        out.put(key, value);
    }

    /**
     * Perform the current action.
     *
     * @throws java.lang.Exception
     */
    public void run() {
        this.executeIf = readBooleanArgument("executeIf", true);
        this.optional = readBooleanArgument("optional", false);
    };

    /**
     * Allows creating an action that delegates all the work to another action
     * instance.
     */
    public static class TestActionAdapter extends TestAction {

        /**
         * The action instance that the adaptor delegates to
         */
        protected TestAction action;

        @Override
        protected void writeOutput(String key, Object value) {
            this.action.writeOutput(key, value);
        }

        @Override
        public void writeArgument(String argName, Object value) {
            this.action.writeArgument(argName, value);
        }

        @Override
        public String readStringArgument(String argName) {
            return this.action.readStringArgument(argName);
        }

        @Override
        public String readStringArgument(String argName, String defaultValue) {
            return this.action.readStringArgument(argName, defaultValue);
        }

        @Override
        public Object readOutputValue(String key) {
            return this.action.readOutputValue(key);
        }

        @Override
        public Object readArgument(String argName) {
            return this.action.readArgument(argName);
        }

        @Override
        public Object readArgument(String argName, Object defaultValue) {
            return this.action.readArgument(argName, defaultValue);
        }

        @Override
        public Integer readIntArgument(String argName) {
            return this.action.readIntArgument(argName);
        }

        @Override
        public Integer readIntArgument(String argName, Integer defaultValue) {
            return this.action.readIntArgument(argName, defaultValue);
        }

        @Override
        public void run() throws RuntimeException {
            this.action.run();
        }

        @Override
        public void initialize() {
            this.action.initialize();
        }

        @Override
        public Boolean hasOutput(String key) {
            return this.action.hasOutput(key);
        }

        @Override
        public Boolean hasArgument(String key) {
            return this.action.hasArgument(key);
        }

        @Override
        public Map<String, Object> getOutput() {
            return this.action.getOutput();
        }

        @Override
        public String[] getArgNames() {
            return this.action.getArgNames();
        }

    }
}

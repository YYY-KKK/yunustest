package dtest.base;

import dtest.base.contracts.ILogger;
import dtest.base.exceptions.ArgumentException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public abstract class TestAction {

    private Map<String, Object> args;
    
    /**
     * At runtime, this field will be populated with a reference to the test
     * actor's logger. The text written to this logger is sent both to the
     * console and to the sync service via HTTP.
     */
    protected ILogger log;

    private Map<String, Object> out;

    /**
     * Returns the current list of argument names.
     *
     * @return
     */
    public String[] getArgNames() {
        Set<String> keySet = args.keySet();
        return keySet.toArray(new String[keySet.size()]);
    }

    /**
     * Returns the current list of output keys.
     *
     * @return
     */
    public String[] getOutputKeys() {
        Set<String> keySet = out.keySet();
        return keySet.toArray(new String[keySet.size()]);
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
     * arguments are populated. Subclasses should override it whenever they need
     * to run initialization logic.
     */
    public void initialize() {
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
            return (int)Double.parseDouble(argValue);
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
        return Boolean.valueOf(readArgument(argName, defaultValue).toString());
    }
    
    /**
     * Reads the argument value for the key specified, as a Boolean.
     *
     * @param argName The argument whose value will be returned
     * @return
     */
    public String readBooleanArgument(String argName) {
        return readStringArgument(argName, null);
    }
    
    /**
     * Reads the output value for the key specified
     *
     * @param key The key whose value will be returned
     * @return
     */
    public Object readOutput(String key) {
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
     * Perform the work for the this.action.
     *
     * @throws java.lang.Exception
     */
    public abstract void run() throws Exception;

    /**
     * Allows creating an action that delegates all the work to another action instance.
     */
    public static class TestActionAdapter extends TestAction {

        /** The action instance that the adaptor delegates to */
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
        public Object readOutput(String key) {
            return this.action.readOutput(key);
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
        public void run() throws Exception {
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
        public String[] getOutputKeys() {
            return this.action.getOutputKeys();
        }

        @Override
        public String[] getArgNames() {
            return this.action.getArgNames();
        }

    }
}

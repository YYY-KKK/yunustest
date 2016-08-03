package dtest.base;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public abstract class TestAction {
    
    private Map<String, Object> args;
            
    private Map<String, Object> out;
    
    /**
     * Returns the current list of argument names.
     *
     * @return
     */
    public String[] getArgsKeys() {
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
     * @param key The argument name to check for
     * @return
     */
    public Boolean hasArgument(String key) {
        return args != null && args.get(key) != null;
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
    
    public void initialize() {}

    /**
     * Reads the argument value for the key specified, as an integer.
     *
     * @param key The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Integer readIntArgument(String key, Integer defaultValue) {
        // Keeping the following line outside of the try/catch allows for a more
        // logical/useful error message when the argument is missing from the
        // test definition
        String argValue = readArgument(key, defaultValue).toString();

        try {
            return Integer.parseInt(argValue);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as an integer",
                    key), ex);
        }
    }

    /**
     * Reads the argument value for the key specified, as an integer.
     *
     * @param key The argument whose value will be returned
     * @return
     */
    public Integer readIntArgument(String key) {
        return readIntArgument(key, null);
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param key The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public Object readArgument(String key, Object defaultValue) {
        if (this.hasArgument(key)) {
            return args.get(key);
        } else if (defaultValue != null) {
            return defaultValue;
        } else {
            throw new RuntimeException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    key,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param key The argument whose value will be returned
     * @return
     */
    public Object readArgument(String key) {
        return readArgument(key, null);
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
     * @param key The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     * @return
     */
    public String readStringArgument(String key, String defaultValue) {
        return readArgument(key, defaultValue).toString();
    }

    /**
     * Reads the argument value for the key specified, as a string.
     *
     * @param key The argument whose value will be returned
     * @return
     */
    public String readStringArgument(String key) {
        return readStringArgument(key, null);
    }

    public void writeArgument(String key, Object value) {
        if (args == null) {
            args = new HashMap<>();
        }

        args.put(key, value);
    }

    /**
     * Writes an output value for the current action.
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
     * Perform the work for the action.
     *
     * @throws java.lang.Exception
     */
    public abstract void run() throws Exception;
}

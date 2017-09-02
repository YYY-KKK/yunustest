package dtest.base;

import com.google.gson.Gson;
import dtest.base.contracts.ILogger;
import dtest.base.contracts.ITestActor;
import dtest.base.exceptions.ArgumentException;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * Base class for all test actions. Derived classes must override the "run"
 * method and make sure to call the base class implementation of the method
 * using the super.run() syntax on the first line.
 */
public abstract class TestAction {

    private ITestActor actor;

    private Map<String, Object> args;

    /**
     * If not null, will be used as the description of the action, overriding
     * the description property specified in the test definition file
     */
    private String description;

    /**
     * If set to true, a failure in this action will not cause the test to fail.
     * Instead, execution will resume as if the action had succeeded.
     */
    private boolean optional;

    /**
     * At runtime, this field will be populated with a reference to the test
     * actor's logger. The text written to this logger is sent both to the
     * console and to the sync service via HTTP.
     */
    protected ILogger log;

    private Map<String, Object> out;

    private TestSessionStatus session;

    /**
     * Returns the list of argument names for the action.
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

    public ITestActor getActor() {
        return this.actor;
    }

    public TestSessionStatus getSession() {
        return this.session;
    }

    /**
     * Returns true if the argument with the specified key exists and false
     * otherwise.
     *
     * @param argName The argument name to check for
     */
    public Boolean hasArgument(String argName) {
        return args != null && args.containsKey(argName);
    }

    /**
     * Returns true if the output value with the specified key exists and false
     * otherwise.
     *
     * @param key The output key name to check for
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

    /**
     * Return a value that shows whether a failure in this action will cause the
     * whole test to fail. If false is returned, when this action fails
     * execution will resume as if the action had succeeded.
     */
    public boolean isOptional() {
        return optional;
    }

    /**
     * Reads the argument value for the specified key, as a string.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public Object readArgument(String argName, Object defaultValue) {
        if (this.hasArgument(argName)) {
            return args.get(argName);
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a string.
     *
     * @param argName The argument whose value will be returned
     */
    public Object readArgument(String argName) {
        if (this.hasArgument(argName)) {
            return args.get(argName);
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as a List.
     *
     * @param klass The type of the array elements
     * @param argName The argument whose value will be returned
     */
    public <T> List<T> readArrayArgument(String argName, Class klass, ArrayList<T> defaultValue) {
        if (this.hasArgument(argName)) {
            return this.toList(argName, args.get(argName), klass);
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a List.
     *
     * @param klass The type of the array elements
     * @param argName The argument whose value will be returned
     */
    public <T> List<T> readArrayArgument(String argName, Class klass) {
        if (this.hasArgument(argName)) {
            return this.<T>toList(argName, args.get(argName), klass);
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as a double.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public Double readDoubleArgument(String argName, Double defaultValue) {
        if (this.hasArgument(argName)) {
            return toDouble(argName, args.get(argName));
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a double.
     *
     * @param argName The argument whose value will be returned
     */
    public Double readDoubleArgument(String argName) {
        if (this.hasArgument(argName)) {
            return toDouble(argName, args.get(argName));
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as an integer.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public Integer readIntArgument(String argName, Integer defaultValue) {
        if (this.hasArgument(argName)) {
            return toInteger(argName, args.get(argName));
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as an integer.
     *
     * @param argName The argument whose value will be returned
     */
    public Integer readIntArgument(String argName) {
        if (this.hasArgument(argName)) {
            return toInteger(argName, args.get(argName));
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as an integer.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public BufferedImage readImageArgument(String argName, BufferedImage defaultValue) {
        if (this.hasArgument(argName)) {
//            return toInteger(argName, args.get(argName));
            return null;
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as an integer.
     *
     * @param argName The argument whose value will be returned
     */
    public BufferedImage readImageArgument(String argName) {
        if (this.hasArgument(argName)) {
//            return toInteger(argName, args.get(argName));
            return null;
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as a Map.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public Map<String, Object> readMapArgument(String argName, Map<String, Object> defaultValue) {
        if (this.hasArgument(argName)) {
            return toMap(argName, args.get(argName));
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a Map.
     *
     * @param argName The argument whose value will be returned
     */
    public Map<String, Object> readMapArgument(String argName) {
        if (this.hasArgument(argName)) {
            return toMap(argName, args.get(argName));
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the argument value for the specified key, as a Boolean.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public Boolean readBooleanArgument(String argName, Boolean defaultValue) {
        if (this.hasArgument(argName)) {
            return toBooolean(argName, args.get(argName));
        } else {
            return defaultValue;
        }
    }

    /**
     * Reads the argument value for the specified key, as a Boolean.
     *
     * @param argName The argument whose value will be returned
     */
    public Boolean readBooleanArgument(String argName) {
        if (this.hasArgument(argName)) {
            return toBooolean(argName, args.get(argName));
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Reads the output value for the specified key.
     *
     * @param key The key whose value will be returned
     */
    public Object readOutputValue(String key) {
        if (out == null) {
            return null;
        } else {
            return out.get(key);
        }
    }

    /**
     * Reads the argument value for the specified key, as a string.
     *
     * @param argName The argument whose value will be returned
     * @param defaultValue The default value that will be returned if the
     * specified argument is not populated
     */
    public String readStringArgument(String argName, String defaultValue) {
        Object value = readArgument(argName, defaultValue);
        if (value != null) {
            return String.valueOf(value);
        } else {
            return null;
        }
    }

    /**
     * Reads the argument value for the specified key, as a string.
     *
     * @param argName The argument whose value will be returned
     */
    public String readStringArgument(String argName) {
        if (this.hasArgument(argName)) {
            return toString(argName, args.get(argName));
        } else {
            throw new ArgumentException(String.format(
                    "Mandatory argument \"%s\" was not populated for action %s.",
                    argName,
                    this.getClass().getName()));
        }
    }

    /**
     * Execute the current action.
     */
    public void run() {
        // TODO: Deprecate argument names not prefixed with $
        this.description = readStringArgument("$description", null);
        this.optional = readBooleanArgument("$optional", readBooleanArgument("optional", false));
    }

    public void setActor(ITestActor actor) {
        // Session can only be set once
        if (this.actor == null) {
            this.actor = actor;
        } else {
            throw new RuntimeException("An attempt was made to update the test action's actor. The actor can only be set once");
        }
    }

    public void setLogger(ILogger logger) {
        this.log = logger;
    }

    public void setSession(TestSessionStatus session) {
        // Session can only be set once
        if (this.session == null) {
            this.session = session;
        } else {
            throw new RuntimeException("An attempt was made to update the test action session. The session can only be set once");
        }
    }

    /**
     * This method is called by the test actor to take screenshots that are
     * relevant for the current execution context and can be used to
     * troubleshoot failed tests. Derived classes can override it as necessary.
     * The screenshots need to be in PNG format.
     */
    public java.io.InputStream takeScreenshot() {
        return null;
    }

    /**
     * Parses the specified argument value as an ArrayList object of the type
     * specified.
     */
    private <T extends Object> List<T> toList(String argName, Object objValue, Class klass) {
        try {
            if (objValue instanceof List) {
                return (List<T>) objValue;
            } else if (objValue instanceof ScriptObjectMirror) {
//                return (List<T>)ScriptUtils.convert(objValue, Object[].class);
                Object[] objArray = ((ScriptObjectMirror) objValue).to(Object[].class);
                return (List<T>) Arrays.asList(objArray);
            } else if (objValue.getClass().isArray()) {
                ArrayList<T> list = new ArrayList<T>();

                for (T item : (T[]) objValue) {
                    // TODO: find a way to make sure the type of "item" is indeed "T"
                    if (klass.isInstance(item)) {
                        list.add(item);
                    } else {
                        throw new RuntimeException(String.format(
                                "Array element %s does not have the expected type %s.",
                                item,
                                klass.getName()));
                    }
                }
                return list;
            } else {
                List<T> list = new ArrayList<T>();
                list.add((T) objValue);
                return list;
            }
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as an array",
                    argName), ex);
        }
    }

    /**
     * Parses the specified argument value as an Boolean object.
     */
    private Boolean toBooolean(String argName, Object objValue) {
        if (objValue instanceof Boolean) {
            return (Boolean) objValue;
        }

        String argValue = objValue.toString().toLowerCase();
        switch (argValue) {
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
                        "Failed to parse argument %s as a boolean",
                        argValue));
        }
    }

    /**
     * Parses the specified argument value as an Double object.
     */
    private Double toDouble(String argName, Object objValue) {
        try {
            return Double.parseDouble(String.valueOf(objValue));
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as Double",
                    argName), ex);
        }
    }

    /**
     * Parses the specified argument value as an Integer object.
     */
    private Integer toInteger(String argName, Object objValue) {
        try {
            // We first parse it as a double to avoid errors when parsing values like "1.0"
            double numberAsDouble = Double.parseDouble(String.valueOf(objValue));
            String intergerPart = String.valueOf(numberAsDouble).split(Pattern.quote("."))[0];
            return Integer.parseInt(intergerPart);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as Integer",
                    argName), ex);
        }
    }

    /**
     * Parses the specified argument value as a Map object.
     */
    private Map<String, Object> toMap(String argName, Object objValue) {
        try {
            if (objValue instanceof String) {
                // This code should not normally be reached, since map arguments are passed
                // in as maps already by the test actor. This is just a precaution.
                Gson gson = new Gson();
                Map<String, Object> map = new HashMap<String, Object>();
                objValue = gson.fromJson(argName, map.getClass());
            }

            return (Map<String, Object>) objValue;
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as a Map",
                    argName), ex);
        }
    }

    /**
     * Parses the specified argument value as a String object.
     */
    private String toString(String argName, Object objValue) {
        try {
            return String.valueOf(objValue);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to parse argument %s as String",
                    argName), ex);
        }
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
}

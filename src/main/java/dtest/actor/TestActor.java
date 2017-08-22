package dtest.actor;

import com.google.gson.*;
import dtest.actor.yaml.SkipNullRepresenter;
import dtest.base.TestAction;
import dtest.base.TestSessionStatus;
import dtest.base.contracts.ILogger;
import dtest.base.contracts.ITestActor;
import dtest.base.exceptions.ParameterNotFoundException;
import dtest.base.http.ContentType;
import dtest.base.http.HttpRequest;
import dtest.base.http.HttpVerb;
import dtest.base.logging.*;
import dtest.base.testdef.*;
import dtest.base.util.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.lang.reflect.Field;
import java.math.BigInteger;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.jar.JarFile;
import javax.imageio.ImageIO;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.AbstractJSObject;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.Undefined;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.parser.ParserException;

/**
 * Implements the core functionality for a test actor type: reads the
 * configuration from a properties file, announces the actorType to the sync
 * service, then identifies, parses and executes the tests, as orchestrated by
 * the sync service.
 */
public class TestActor implements ITestActor {

    /**
     * The string identifier of the actorType.
     */
    private String actorId;

    /**
     * Identifies the type of actorType (GMA, NP6, etc.).
     */
    private final String actorType;

    private long announceCount = 0;

    private Thread announceThread;

    /**
     * Flags all threads and activities to shut down.
     */
    private boolean actorIsStopping;

    private Properties config;

    /**
     * The test action instance that is currently being executed, or null.
     */
    private TestAction currentAction;

    /**
     * The number of the current test action in the current test step being
     * executed.
     */
    private Integer currentActionNo;

    /**
     * Stores information about the test action currently executing. This info
     * is passed to the sync service when a test step ends to be used for
     * reporting purposes.
     */
    private TestActionInfo currentActionInfo;

    /**
     * In a data-driven test, this stores the data table containing the data
     * records to iterate over.
     */
    private List<Object> currentDataSet;

    /**
     * Stores the name of the currently executing macro, if any, or null
     * otherwise.
     */
    private String currentMacro;

    private String currentScript;

    /**
     * Stores information about the test actions in the current test step. This
     * info is passed to the sync service to be used for reporting purposes.
     */
    private List<TestActionInfo> currentStepActions;

    /**
     * The number of the current test step in the current test being executed.
     */
    private Integer currentStepNo;

    private boolean currentStepIsCompleted;

    /**
     * Stores information about the current test session, if any. If not null,
     * it means that this test actorType was acquired by the sync service and
     * allocated to a particular test session
     */
    private TestSessionStatus currentSessionStatus;

    private TestDefinition currentTest;

    /**
     * Caches the content of data files used in the tests, as soon as a test
     * first reads a value from a data file. The cache is reset at the beginning
     * of each test session.
     */
    private Map<String, Object> dataFileCache;

    private String httpProxy;

    private ILogger log;

    /**
     * The output values for the last test action that was executed, if any.
     */
    private Map<String, Object> lastActionOutput;

    /**
     * The output values for the current macro action being executed, if any.
     */
    private Map<String, Object> lastMacroOutput;

    /**
     * The output values for the current script action being executed, if any.
     */
    private Map<String, Object> lastScriptOutput;

    /**
     * The arguments for the current macro action being executed (if any).
     */
    private Map<String, Object> macroArgs;

    /**
     * Caches macro definitions so we don't have to load them from disk every
     * time they're used.
     */
    private Map<String, MacroDefinition> macroCache;

    private ScriptEngine scriptEngine;

    private final String syncServiceBaseUrl;

    private final String testRepoDirName;

    private String testRepoLocation;

    private File tempDir;

    private File workDir;

    public TestActor() {
        this(null);
    }

    public TestActor(Map<Object, Object> configOverrides) {
        ConsoleLogger consoleLogger = new ConsoleLogger();
        this.log = consoleLogger;
        this.log.info("");

        Logger.setLogger(this.log);

        // This will help avoid some very anoying consolemessages from the Apache HTTP client
        org.apache.log4j.Logger.getLogger("org.apache.commons.httpclient").setLevel(org.apache.log4j.Level.ERROR);

        this.config = Configuration.getConfiguration("actor.properties");

        if (configOverrides != null) {
            this.config.putAll(configOverrides);
        }

        consoleLogger.setLevel(LogLevel.valueOf(config.getProperty("logLevel", "DEBUG")));

        logJarVersions();

        try {
            // The configuration is loaded from the main JAR file's resources, so
            // we are logging the main class name so we can troubleshoot later
            Class<?> mainClass = MainUtil.getMainClass();
            Logger.trace(String.format("The main class is %s", mainClass.getName()));
        } catch (Exception ex) {
        }

        Thread.currentThread().setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread t, Throwable e) {
                Logger.error(e);
            }
        });

        this.actorId = getStringParameter("actorId", "");
        this.actorType = getStringParameter("actorType");
        if (this.actorType.matches("(.*)[^A-Z0-9\\-_](.*)")) {
            throw new RuntimeException(String.format(
                    "Actor type %s in not valid. The actor type can only contain uppercase letters, numbers, dashes and uderscores.",
                    this.actorType));
        }
        this.httpProxy = config.getProperty("httpProxy");
        if (this.httpProxy != null) {
            Logger.debug(String.format("Using HTTP proxy server %s ", this.httpProxy));
        }
        this.lastActionOutput = new HashMap<>();
        this.lastMacroOutput = new HashMap<>();
        this.lastScriptOutput = new HashMap<>();
        this.syncServiceBaseUrl = getStringParameter("syncServiceBaseUrl").replaceAll("^[\\s]+|[/\\s]+$", "");

        this.tempDir = Paths.get(System.getProperty("user.dir"), "work", "temp").toFile();
        this.workDir = Paths.get(System.getProperty("user.dir"), "work").toFile();
        tempDir.mkdirs();

        this.testRepoDirName = getStringParameter("testRepoDirName", "").replaceAll("^[\\\\/\\s]+|[\\\\\\/\\s]+$", "");
        this.testRepoLocation = getStringParameter("testRepoLocation", "");
        this.testRepoLocation = this.testRepoLocation.replaceAll("^[\\s]+|[\\\\\\/\\s]+$", "");

        if (this.actorId == null || this.actorId.isEmpty()) {
            SecureRandom random = new SecureRandom();
            this.actorId = new BigInteger(16, random).toString(10);
        }
        this.actorIsStopping = false;
        this.currentSessionStatus = null;

        startAnnounceThread();
    }

    private void abandonSession() {
        this.currentSessionStatus = null;
    }

    /**
     * Announces the actorType to the sync service, so it can be used for
     * running a test session.
     */
    private void announce() {
        ++this.announceCount;

        try {
            HttpRequest request = new HttpRequest(
                    this.syncServiceBaseUrl + "/api/actor/announce",
                    HttpVerb.POST,
                    this.httpProxy);
            request.setContent(String.format("{\"actorId\":\"%s\",\"actorType\":\"%s\"}", actorId, actorType), ContentType.APPLICATION_JSON);
            request.execute();

            int statusCode = request.getResponseStatusCode();
            if (statusCode != 200) {
                throw new RuntimeException(String.format("Failed to announce actor %s%s to the sync service. The HTTP request was %s %s. The response status code was %s.",
                        this.actorType,
                        this.actorId != null ? String.format("(%s)", this.actorId) : "",
                        request.getHttpVerb(),
                        request.getUri(),
                        statusCode));
            }

            String response = request.getResponseAsString();
            JsonElement jelement = new JsonParser().parse(response);
            JsonElement testSessionIdElem = jelement.getAsJsonObject().get("testSessionId");

            if (testSessionIdElem != null && !testSessionIdElem.isJsonNull()) {
                String testSessionId = testSessionIdElem.getAsString();
                String currentSessionId = this.currentSessionStatus != null
                        ? this.currentSessionStatus.id
                        : null;

                if (this.currentSessionStatus == null || !testSessionId.equals(currentSessionId)) {
                    Logger.trace("Initializing test session information in the \"announce\" method...");
                    Logger.trace(String.format("Session ID in sync server response was %s; actor session ID was %s",
                            testSessionId,
                            currentSessionId));
                    this.currentSessionStatus = new TestSessionStatus(testSessionId);
                }
            } else {
                this.currentSessionStatus = null;
            }
        } catch (Exception ex) {
            ex.printStackTrace();

            try {
                Thread.sleep(10000);
            } catch (InterruptedException ex1) {
            }
        }
    }

    /**
     * Sets a flag that signals all threads and activities for this actorType to
     * shut down.
     */
    @Override
    public void close() {
        actorIsStopping = true;
    }

    /**
     * Initialize the JavaScript interpreter that will be used to evaluate
     * action arguments and run "script" test actions.
     */
    private ScriptEngine createScriptEngine() {
        ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");

        try {
            InputStream inputStream;

            inputStream = this.getClass().getResourceAsStream("/js/helpers.js");
            engine.eval(new InputStreamReader(inputStream));

            inputStream = this.getClass().getResourceAsStream("/js/external/almond.js");
            engine.eval(new InputStreamReader(inputStream));

            inputStream = this.getClass().getResourceAsStream("/js/loadAmdModuleAs.js");
            String loadAmdModuleAs = IOUtils.toString(inputStream, Charset.forName("UTF-8"));

            inputStream = this.getClass().getResourceAsStream("/js/external/deep-diff.js");
            String moduleDeepDiff = IOUtils.toString(inputStream, Charset.forName("UTF-8"));
            engine.eval(loadAmdModuleAs
                    .replace("$MODULE_NAME", "deep-diff")
                    .replace("$MODULE_SOURCE", moduleDeepDiff));

            inputStream = this.getClass().getResourceAsStream("/js/createGlobals.js");
            engine.eval(new InputStreamReader(inputStream));
        } catch (Exception ex) {
            throw new RuntimeException("Failed to evaluate JS code while preparing the JS interpreter", ex);
        }

        // Keeping a final reference to the current actorType instance, so that we
        // can access it from the anonymous classes below
        final TestActor actor = this;

        engine.put("$tempDir", this.tempDir);

        engine.put("$test", this.currentTest);

        // $data
        engine.put("$data", new Function<String, Object>() {
            @Override
            public Object apply(String relativePath) {
                if (dataFileCache.containsKey(relativePath)) {
                    return dataFileCache.get(relativePath);
                } else {
                    InputStream dataFileStream;
                    try {
                        dataFileStream = getTestAsset("data", relativePath);
                    } catch (Exception ex) {
                        throw new RuntimeException(String.format("Failed to get data file \"%s\".",
                                relativePath), ex);
                    }

                    Object dataFileContent;
                    try {
                        Yaml yaml = new Yaml();
                        dataFileContent = yaml.load(dataFileStream);
                    } catch (ParserException ex) {
                        throw new RuntimeException(String.format("Failed to parse data file \"%s\".",
                                relativePath), ex);
                    }

                    try {
                        dataFileCache.put(relativePath, dataFileContent);
                        dataFileContent = evalObject(dataFileContent);
                        return dataFileContent;
                    } catch (Exception ex) {
                        throw new RuntimeException(String.format("Failed to evaluate data file \"%s\".",
                                relativePath), ex);
                    }
                }
            }
        });

        // $eval
        engine.put("$eval", new Function<Object, Object>() {
            @Override
            public Object apply(Object expression) {
                return evalObject(expression);
            }
        });

        // $include
        engine.put("$include", new Consumer<String>() {
            @Override
            public void accept(String fileName) {
                String script = null;

                try {
                    InputStream scriptFileStream;
                    scriptFileStream = getTestAsset("script", fileName);
                    StringWriter writer = new StringWriter();
                    IOUtils.copy(scriptFileStream, writer, Charset.forName("UTF-8"));
                    script = writer.toString();

                } catch (Exception ex) {
                    throw new RuntimeException(String.format("Failed to get script file \"%s\".",
                            fileName), ex);
                }

                try {
                    actor.scriptEngine.eval(script);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format("Failed to run script file %s", fileName));
                }
            }
        });

        // $image
        engine.put("$image", new Function<String, BufferedImage>() {
            @Override
            public BufferedImage apply(String fileName) {
                File imageFile = new File(fileName);
                if (imageFile.isAbsolute()) {
                    // For an absolute path the file must already exist on disk,
                    // so we just read and return it. This is only recommended for
                    // troubleshooting and quick POCs during test development. Always
                    // use relative paths in production code and let the test actor
                    // request the image file from the sync service.
                    try {
                        return ImageIO.read(imageFile);
                    } catch (IOException ex) {
                        throw new RuntimeException(String.format(
                                "Failed reading image file %s",
                                fileName), ex);
                    }
                } else {
                    // A relative path means that the file will be requested from the
                    // sync server and cached on disk. Subsequently, the cached version
                    // will be used instead, to optimize bandwidth and performance
                    Path imagePath = Paths.get(
                            actor.workDir.getAbsolutePath(),
                            "images",
                            fileName);

                    long timeThreshold = System.currentTimeMillis() - 5 * 60 * 1000;
                    if (Files.exists(imagePath)
                            && imagePath.toFile().lastModified() > timeThreshold) {

                        Logger.trace(String.format(
                                "Using cached version of image file stored at \"%s\"",
                                imagePath.normalize().toString()));
                    } else {
                        Logger.trace(String.format(
                                "Requesting image file \"%s\" from server",
                                fileName));
                        try {
                            InputStream imageStream = getTestAsset("image", fileName);
                            imagePath.toFile().getParentFile().mkdirs();
                            OutputStream outputStream = new FileOutputStream(imagePath.toFile(), false);
                            IOUtils.copy(imageStream, outputStream);
                            outputStream.close();
                            imageStream.close();
                        } catch (Exception ex) {
                            throw new RuntimeException(String.format(
                                    "Failed reading image file %s from sync server",
                                    fileName), ex);
                        }
                    }

                    try {
                        return ImageIO.read(imagePath.toFile());
                    } catch (IOException ex) {
                        throw new RuntimeException(String.format(
                                "Failed reading image file %s from sync server",
                                fileName), ex);
                    }
                }
            }
        });

        // $json
        engine.put("$json", new Function<Object, Object>() {
            @Override
            public Object apply(Object value) {
                actor.scriptEngine.put("$scriptObjectToSerialize", value);
                String scriptObjJson;

                try {
                    scriptObjJson = actor.scriptEngine
                            .eval("JSON.stringify($scriptObjectToSerialize)")
                            .toString();
                } catch (Exception ex) {
                    throw new RuntimeException(String.format(
                            "Failed to convert value to JSON. The value was %s",
                            value));
                }

                return scriptObjJson;
            }
        });

        // $_logError
        engine.put("$_logError", (Consumer<String>) (String text) -> {
            Logger.error(text);
        });

        // $_logInfo
        engine.put("$_logInfo", (Consumer<String>) (String text) -> {
            Logger.info(text);
        });

        // $_logWarn
        engine.put("$_logWarn", (Consumer<String>) (String text) -> {
            Logger.error(text);
        });

        try {
            engine.eval("$log = { error:  $_logError, info: $_logInfo, warn: $_logWarn }");
        } catch (Exception ex) {
        }

        // $macroArgs
        engine.put("$macroArgs", new Function<String, Object>() {
            @Override
            public Object apply(String argName) {
                if (actor.macroArgs != null) {
                    try {
                        return actor.convertToJavaScriptType(actor.macroArgs.get(argName));
                    } catch (Exception ex) {
                        throw new RuntimeException(String.format(
                                "Failed to read macro argument %s",
                                argName), ex);
                    }

                } else {
                    return null;
                }
            }
        });

        // $readOutput
        engine.put("$readOutput", new Function<String, Object>() {
            @Override
            public Object apply(String valueName) {
                if (actor.lastActionOutput != null) {
                    if (actor.lastActionOutput.containsKey(valueName)) {
                        return actor.lastActionOutput.get(valueName);
                    } else {
                        return null;
                    }
                } else {
                    throw new RuntimeException("There are no output values to read from. Please report this error to the dev team, including the relevant log files and information on how to reproduce the issue.");
                }
            }
        });

        // $require
        engine.put("$require", new Function<String, Object>() {
            @Override
            public Object apply(String relativePath) {
                // TODO: Continue implementation

                return null;
            }
        });

        // $runAction
        engine.put("$runAction", new BiFunction<String, Object, Object>() {
            @Override
            public Object apply(String className, Object args) {
                Map<String, Object> argsMap = (Map<String, Object>) args;
                try {
                    return executeActionByClassName(className, argsMap);
                } catch (Exception ex) {
                    String actionArguments;
                    if (argsMap.size() > 0) {
                        Gson gson = new Gson();
                        actionArguments = gson.toJson(argsMap);
                    } else {
                        actionArguments = "(no arguments provided)";
                    }

                    throw new RuntimeException(String.format(
                            "Failed executing action %s with arguments %s",
                            className,
                            actionArguments), ex);
                }
            }
        });

        // $runAction
        engine.put("$runMacro", new BiFunction<String, Object, Object>() {
            @Override
            public Object apply(String macroName, Object args) {
                Map<String, Object> argsMap = (Map<String, Object>) args;
                try {
                    return executeMacroActionByName(macroName, argsMap);
                } catch (Exception ex) {
                    String actionArguments;
                    if (argsMap.size() > 0) {
                        Gson gson = new Gson();
                        actionArguments = gson.toJson(argsMap);
                    } else {
                        actionArguments = "(no arguments provided)";
                    }

                    throw new RuntimeException(String.format(
                            "Failed executing action %s with arguments %s",
                            macroName,
                            actionArguments), ex);
                }
            }
        });

        engine.put("$sharedData", new TestActor.SharedDataFunction());

        // $writeMacroOutput
        engine.put("$writeMacroOutput", new BiConsumer<String, Object>() {
            @Override
            public void accept(String valName, Object value) {
                actor.lastMacroOutput.put(valName, value);
            }
        });

        // $writeOutput
        engine.put("$writeOutput", new BiConsumer<String, Object>() {
            @Override
            public void accept(String valName, Object value) {
                actor.lastScriptOutput.put(valName, value);
            }
        });

        return engine;
    }

    /**
     * Deal with deprecated arguments and other recoverable error conditions
     * related to test action arguments.
     */
    private void curateArguments(Map<String, Object> args) {
        // executeIf was deprecated in favor of $if
        if (args.containsKey("executeIf")) {
            args.put("$if", args.get("executeIf"));
            args.remove("executeIf");
        }

        // optional was deprecated in favor of $optional
        if (args.containsKey("optional")) {
            args.put("$optional", args.get("optional"));
            args.remove("optional");
        }
    }

    /**
     * Replace invalid property names for map objects that are about to be
     * converted into JSON and later on inserted into a database like MongoDB.
     */
    private Map<String, Object> curatePropertyNames(Map<String, Object> map) {
        if (map == null) {
            return null;
        }

        Map<String, Object> result = new HashMap<>();

        for (String propName : map.keySet()) {
            String newName = propName;

            if (propName.startsWith("$")) {
                newName = propName.replaceFirst("\\$", "d\\$");
            }

            result.put(newName, map.get(propName));
        }

        return result;
    }

    /**
     * Converts a value from a Java type to a JavaScript native type, by first
     * serializing it to a JSON string and then using JSON.parse. This is
     * necessary to allow the use of JS APIs on arrays and objects (e.g.
     * Array.prototype.join, Object.keys, etc.), instead of requiring test
     * automation developers to work with those values using Java APIs.
     */
    private Object convertToJavaScriptType(Object value) {
        try {
            // Check if the value is a List or Map, but exclude ScriptObjectMirror
            // instances, because they are already JS native types
            if ((value instanceof List || value instanceof Map)
                    && !(value instanceof ScriptObjectMirror)) {

                Gson gson = new Gson();
                String json = gson.toJson(value);
                return this.scriptEngine.eval(String.format("JSON.parse('%s')", json));
            } else {
                return value;
            }
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to convert value %s to a native JavaScript type",
                    value), ex);
        }
    }

    private static Object convertToJavaType(Object inputObj) {
        if (inputObj instanceof ScriptObjectMirror) {
            ScriptObjectMirror scriptObjectMirror = (ScriptObjectMirror) inputObj;
            if (scriptObjectMirror.isArray()) {
                List<Object> list = new ArrayList<>();
                for (Map.Entry<String, Object> entry : scriptObjectMirror.entrySet()) {
                    list.add(convertToJavaType(entry.getValue()));
                }
                return list;
            } else {
                Map<String, Object> map = new HashMap<>();
                for (Map.Entry<String, Object> entry : scriptObjectMirror.entrySet()) {
                    map.put(entry.getKey(), convertToJavaType(entry.getValue()));
                }
                return map;
            }
        } else {
            return inputObj;
        }
    }

    /**
     * Evaluate an object as JavaScript (if applicable) and return the evaluated
     * value. In the case of maps or arrays, we evaluate each one of their
     * element's values recursively.
     *
     * @param objValue
     * @return
     */
    private Object evalObject(Object objValue) {
        if (objValue == null) {
            return null;
        }

        if (objValue instanceof Map) {
            Map<String, Object> mapValue = (Map) objValue;
            for (Map.Entry<String, Object> entry : mapValue.entrySet()) {
                try {
                    Object result = evalObject(entry.getValue());
                    mapValue.put(entry.getKey(), result);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format(
                            "There was an error while evaluating property \"%s\"",
                            entry.getKey()), ex);
                }
            }
            return mapValue;
        } else if (objValue instanceof ArrayList) {
            // Evaluate all elements of the array
            ArrayList arrayValue = (ArrayList) objValue;
            for (int index = 0; index < arrayValue.size(); ++index) {
                arrayValue.set(index, evalObject(arrayValue.get(index)));
            }
            return arrayValue;
        } else if (objValue instanceof String) {
            Object returnValue = (String) objValue;
            boolean evaluationFinished = false;
            int iterationCount = 0;
            Object evalResult;

            // Evaluate the JS expression, then evaluate the result of the
            // evaluation, until we no longer have a JS expression, but only
            // an ordinary string
            while (!evaluationFinished) {
                ++iterationCount;

                if (iterationCount >= 100) {
                    throw new RuntimeException(String.format(
                            "We iterated %s times while evaluating a JavaScript data property. We are giving up, since there is likely a circular dependency between data properties.",
                            iterationCount));
                }

                try {
                    if (returnValue instanceof String) {
                        evalResult = evalString((String) returnValue);
                    } else {
                        evalResult = evalObject(returnValue);
                    }
                } catch (StackOverflowError e) {
                    throw new RuntimeException(String.format(
                            "We got a StackOverflowError while evaluating a data property. The property's value was \"%s\". This is typically caused by a circular dependency (e.g. property1 refercencing property2, which, in turn, references property1).",
                            objValue
                    ));
                }

                if (evalResult == returnValue) {
                    evaluationFinished = true;
                }

                returnValue = evalResult;
            }

            return returnValue;
        } else {
            return objValue;
        }
    }

    /**
     * If the specified string is a JavaScript expression, it returns the
     * expression's result. Otherwise, it returns the plain string value.
     */
    private Object evalString(String expression) {
        // A string is considered to be a JS expression if it start with $script
        // or one of the special $-prefixed functions
        if (expression.matches("(?s)^[\\s\\n]*(\\$data|\\$dataRecord|\\$format|\\$eval|\\$image|\\$json|\\$script|\\$macroArgs|\\$sharedData|\\$readOutput).*")) {
            // Remove the $script syntax from the beggining of the string
            String cleanedExpression = expression.replaceAll("^\\s*\\$script\\s*", "");

            try {
                // We must enclose the expression in parantheses, so that object
                // expressions are propely evaluated
                return scriptEngine.eval(String.format("(%s)", cleanedExpression));
            } catch (ScriptException ex) {
                throw new RuntimeException(String.format(
                        "An error was encountered while executing a script. The script content was: %s",
                        cleanedExpression), ex);
            }
        } else {
            // This is not JS code, so we just return the original string
            return expression;
        }
    }

    private Object evalScriptFile(String scriptFileFullPath) throws ScriptException, FileNotFoundException {
        Path scriptPath = Paths.get(scriptFileFullPath);

        if (Files.exists(scriptPath)) {
            this.currentScript = scriptPath.toString();
        }

        return this.scriptEngine.eval(new FileReader(scriptPath.toString()));
    }

    /**
     * Executes an action given the action's Java class and returns the output
     * values produced by the action.
     */
    private Map<String, Object> executeActionByClassName(String actionClassName, Map<String, Object> args) throws Exception {
        this.curateArguments(args);

        if (args.containsKey("$if") && args.get("$if") != Boolean.TRUE) {
            Logger.debug(String.format("Skipping conditional action %s", actionClassName));
            return new HashMap<>();
        }

        try {
            Class actionClass;
            actionClass = Class.forName(actionClassName);

            if (TestAction.class.isAssignableFrom(actionClass)) {
                TestAction actionInstance = (TestAction) actionClass.newInstance();

                actionInstance.setSession(new TestSessionStatus(this.currentSessionStatus));
                actionInstance.setActor(this);

                this.currentAction = actionInstance;

                // Inject the logger instance into the action
                Field[] fields = TestAction.class.getDeclaredFields();
                for (Field f : fields) {
                    if (f.getType().isAssignableFrom(ILogger.class)) {
                        f.setAccessible(true);
                        f.set(actionInstance, this.log);
                        f.setAccessible(false);
                    }
                }

                if (args != null) {
                    for (Map.Entry<String, Object> entry : args.entrySet()) {
                        actionInstance.writeArgument(entry.getKey(), entry.getValue());
                    }
                }

                actionInstance.initialize();

                try {
                    Gson gson = Factory.getGson();
                    Logger.trace(String.format("Executing action %s with arguments %s...",
                            actionClass.getName(),
                            gson.toJson(actionInstance.getArgs())));

                    if (args.containsKey("$screenshot") && args.get("$screenshot").toString().equalsIgnoreCase("before")) {
                        this.takeScreenShot(actionInstance, this.currentStepNo, this.currentActionNo, "before");
                    }

                    actionInstance.run();

                    // If the "takeScreenshot" config parameter is set to "ALWAYS", we
                    // take screenshots after every test action
                    boolean takeScreenshotAlways = this.config.getProperty("takeScreenshot", "").equalsIgnoreCase("ALWAYS");
                    boolean takeScreenshotAfter = args.containsKey("$screenshot") && args.get("$screenshot").toString().equalsIgnoreCase("after");

                    if (takeScreenshotAlways || takeScreenshotAfter) {
                        this.takeScreenShot(actionInstance, this.currentStepNo, this.currentActionNo, "after");
                    }
                } catch (Exception ex) {
                    if (actionInstance.isOptional()) {
                        Logger.debug(String.format(
                                "Optional action %s failed. Execution will continue.",
                                actionInstance.getClass().getName()));
                    } else {
                        throw ex;
                    }
                }

                this.lastActionOutput = actionInstance.getOutput();
                return actionInstance.getOutput();
            } else {
                throw new RuntimeException(String.format("Class %s is not a test action class and cannot be used in test definitions",
                        actionClassName));
            }
        } catch (ClassNotFoundException | NoClassDefFoundError ex) {
            throw new RuntimeException(String.format(
                    "Failed to find test action class \"%s\". Most common causes to watch for are capitalization mistakes (e.g. using \"some.package.sampleAction\" instead \"some.package.SampleAction\") or spelling mistakes. If these look good, make sure the JAR file where the test action class is implemented exists in the CLASSPATH.",
                    actionClassName), ex);
        } catch (InstantiationException | IllegalAccessException ex) {
            throw new RuntimeException(String.format(
                    "Failed to instantiate action class \"%s\"",
                    actionClassName), ex);
        }
    }

    /**
     * Executes an action given the action's definition and returns the output
     * values produced by the action.
     */
    private Map<String, Object> executeActionByDef(TestDefAction actionDef) {
        long startTimeNano = System.nanoTime();
        TestActionInfo localActionInfo = new TestActionInfo();
        localActionInfo.actorType = this.actorType;
        localActionInfo.macro = this.currentMacro;
        localActionInfo.result = null;
        localActionInfo.step = this.currentStepNo;

        try {
            // Added for backward compatibility and will be removed eventually
            if (actionDef.action == null) {
                actionDef.action = actionDef.type;
                actionDef.type = null;
            }

            Map<String, Object> actionArgs = (Map) evalObject(actionDef.args);
            if (actionArgs == null) {
                actionArgs = new HashMap<>();
            }
            localActionInfo.args = actionArgs;

            Map<String, Object> outputValues = null;

            // The currentActionInfo member is used is other methods to get
            // access to the action info object
            this.currentActionInfo = localActionInfo;

            if (actionDef.script != null) {
                // SCRIPT ACTION
                localActionInfo.action = ScriptAction.class.getName();
                actionDef.action = ScriptAction.class.getName();

                try {
                    this.lastScriptOutput = new HashMap<>();
                    String cleanedExpression = actionDef.script.replaceAll("^\\s*\\$script\\s*", "");
                    scriptEngine.eval(cleanedExpression);
                    outputValues = this.lastScriptOutput;
                } catch (ScriptException ex) {
                    throw new RuntimeException(String.format(
                            "There was an error executing a script while processing a script action. The script content was: %s",
                            actionDef.script), ex);
                }
            } else if (actionDef.macro != null) {
                // MACRO ACTION
                localActionInfo.action = MacroAction.class.getName();
                actionDef.action = MacroAction.class.getName();
                executeMacroActionByName(actionDef.macro, actionArgs);
            } else if (actionDef.action != null) {
                // REGULAR ACTION
                localActionInfo.action = actionDef.action;
                outputValues = executeActionByClassName(actionDef.action, actionArgs);
            }

            // Evaluate and publish values in the test's shared data
            if (actionDef.sharedData != null) {
                Map<String, Object> sharedData = new HashMap<String, Object>();

                for (Map.Entry<String, Object> entry : actionDef.sharedData.entrySet()) {
                    sharedData.put(entry.getKey(), this.evalObject(entry.getValue()));
                }

                publishSharedData(sharedData);
            }

            if (outputValues == null) {
                outputValues = new HashMap<String, Object>();
            }

            long endTimeNano = System.nanoTime();
            localActionInfo.duration = (int) ((endTimeNano - startTimeNano) / 1000000000.0);
            localActionInfo.result = "passed";

            return outputValues;
        } catch (Exception ex) {
            localActionInfo.result = "failed";

            String actionType = actionDef.action != null
                    ? actionDef.action
                    : actionDef.macro != null
                            ? actionDef.macro
                            : actionDef.script != null ? "of type \"script\"" : "?";

            String actionArguments;
            if (this.currentAction != null) {
                String[] argNames = this.currentAction.getArgNames();
                if (argNames.length > 0) {
                    actionArguments = this.currentAction.getArgs().toString();
                } else {
                    actionArguments = "(no arguments provided)";
                }
            } else {
                actionArguments = "N/A (current action instance was null)";
            }

            throw new RuntimeException(String.format(
                    "Failed executing action %s with arguments %s",
                    actionType,
                    actionArguments), ex);
        } finally {
            localActionInfo.description
                    = (actionDef.description != null && !actionDef.description.isEmpty())
                    ? actionDef.description
                    : actionDef.action;
            this.currentStepActions.add(localActionInfo);
            this.currentActionInfo = null;
        }
    }

    private Map<String, Object> executeMacroActionByDef(MacroDefinition macroDef, Map<String, Object> macroArgs) throws Exception {
        Map<String, Object> previousMacroArgs = this.macroArgs;
        this.macroArgs = macroArgs;

        Map<String, Object> previousMacroOutput = this.lastMacroOutput;
        this.lastMacroOutput = new HashMap<>();

        Logger.trace(String.format("Executing macro %s with arguments %s...",
                macroDef.fullName,
                macroArgs));

        // Execute the actions for the current macro, in the order
        // they appear in the macro definition file
        if (macroDef.actions != null) {
            for (TestDefAction actionDef : macroDef.actions) {
                try {
                    log.debug(String.format("Executing action %s/%s in macro %s%s...",
                            macroDef.actions.indexOf(actionDef) + 1,
                            macroDef.actions.size(),
                            macroDef.fullName,
                            actionDef.description != null
                                    ? String.format(" (%s)", actionDef.description)
                                    : ""));
                    this.lastActionOutput = executeActionByDef(actionDef);
                } catch (Exception ex) {
                    final DumperOptions options = new DumperOptions();
                    options.setDefaultFlowStyle(DumperOptions.FlowStyle.FLOW);
                    options.setPrettyFlow(true);

                    SkipNullRepresenter representer = new SkipNullRepresenter();
                    representer.addClassTag(TestDefAction.class, Tag.MAP);

                    Yaml yaml = new Yaml(representer, options);
                    String actionDefYaml = yaml.dump(actionDef);

                    throw new RuntimeException(String.format(
                            "There was an error while executing action \"%s\" (with index %s) in macro %s.\nThe action definition was:\n%s",
                            actionDef.action,
                            macroDef.actions.indexOf(actionDef) + 1,
                            macroDef.fullName,
                            actionDefYaml), ex);
                }
            }
        }

        // Remember the current macro output, since we'll
        // have to return that to the caller later
        Map<String, Object> currentMacroOutput = this.lastMacroOutput;

        // Replace the macro state variables with their previous content. This
        // is necessary to properly handle the macro-calling-macro use case.
        this.macroArgs = previousMacroArgs;
        this.lastMacroOutput = previousMacroOutput;

        return currentMacroOutput;
    }

    private Map<String, Object> executeMacroActionByName(String macroFullName, Map<String, Object> macroArgs) throws Exception {
        try {
            macroFullName = macroFullName.replaceAll("[\\.\\\\]", "/").trim();
            this.currentMacro = macroFullName;
            MacroDefinition macroDef = this.getMacroDefinition(macroFullName);
            macroDef.fullName = macroFullName;
            return executeMacroActionByDef(macroDef, macroArgs);
        } catch (Exception ex) {
            throw new Exception(String.format(
                    "There was an error executing macro action %s",
                    macroFullName), ex);
        } finally {
            this.currentMacro = null;
        }
    }

    private void executeTestStep(int stepNumber) throws Exception {
        this.currentStepNo = stepNumber;

        // Notify the sync service that the step execution is starting
        HttpRequest stepStatusRequest = new HttpRequest(
                String.format("%s/api/session/%s/actor/%s/test/%s/step/%s",
                        this.syncServiceBaseUrl,
                        this.currentSessionStatus.id,
                        this.actorId,
                        this.currentSessionStatus.currentTestIndex,
                        stepNumber),
                HttpVerb.PUT,
                this.httpProxy);
        stepStatusRequest.setContent("{\"status\":\"started\",\"result\":\"pending\"}", ContentType.APPLICATION_JSON);
        stepStatusRequest.execute();

        this.currentStepActions = new ArrayList<TestActionInfo>();

        try {
            // Identify the actorType node in the test definition data
            Optional<TestDefActor> testDefActorOpt = currentTest.actors.stream()
                    .filter(a -> a.actorType.equals(this.actorType)).findFirst();
            if (testDefActorOpt.isPresent()) {
                Optional<TestDefStep> testDefStepOpt = testDefActorOpt.get().steps.stream()
                        .filter(s -> s.step == stepNumber).findFirst();
                if (testDefStepOpt.isPresent() && (testDefStepOpt.get().actions != null)) {
                    log.info(String.format("Executing step %s of test %s/%s...",
                            stepNumber,
                            this.currentSessionStatus.currentTestPath,
                            this.currentSessionStatus.currentTestName));

                    // Execute the actions for the current step, in the order
                    // they appear in the test definition file
                    List<TestDefAction> stepActions = testDefStepOpt.get().actions;
                    for (TestDefAction actionDef : stepActions) {
                        this.currentActionNo = stepActions.indexOf(actionDef) + 1;

                        try {
                            log.info(String.format("Executing action %s of step %s%s...",
                                    stepActions.indexOf(actionDef) + 1,
                                    stepNumber,
                                    actionDef.description != null
                                            ? String.format(" (%s)", actionDef.description)
                                            : ""));
                            this.lastActionOutput = executeActionByDef(actionDef);
                        } catch (Exception ex) {
                            if (this.currentAction != null) {
                                this.takeScreenShot(this.currentAction, this.currentStepNo, this.currentActionNo, "error");
                            }

                            String actionName = actionDef.action != null
                                    ? actionDef.action
                                    : actionDef.macro != null
                                            ? actionDef.macro
                                            : actionDef.script != null ? "of type script" : "?";

                            Gson gson = Factory.getGsonBuilder().setPrettyPrinting().create();
                            String actionDefJson = gson.toJson(actionDef);

                            throw new RuntimeException(String.format(
                                    "There was an error while executing action %s (with index %s) in step %s of test %s/%s.\nThe action definition was:\n%s",
                                    actionName,
                                    testDefStepOpt.get().actions.indexOf(actionDef) + 1,
                                    stepNumber,
                                    this.currentSessionStatus.currentTestPath,
                                    this.currentSessionStatus.currentTestName,
                                    actionDefJson), ex);
                        }
                    } // for actionDef in stepActions
                }
            }

            // Notify the sync service that the step execution was completed successfully
            Map<String, Object> content = new HashMap<String, Object>();
            content.put("actions", this.currentStepActions);
            content.put("status", "completed");
            content.put("result", "passed");

            this.currentStepActions.stream().forEach((actioninfo) -> {
                actioninfo.args = this.curatePropertyNames(actioninfo.args);
            });

            Gson gson = Factory.getGson();
            stepStatusRequest.setContent(gson.toJson(content), ContentType.APPLICATION_JSON);
            stepStatusRequest.execute();
        } catch (Exception ex) {
            // Notify the sync service that the step execution failed
            Map<String, Object> content = new HashMap<String, Object>();
            content.put("actions", this.currentStepActions);
            content.put("status", "completed");
            content.put("result", "failed");
            content.put("stackTrace", Logger.getStackTrace(ex));

            this.currentStepActions.stream().forEach((actioninfo) -> {
                actioninfo.args = this.curatePropertyNames(actioninfo.args);
            });

            Gson gson = Factory.getGson();
            String reqPayload = gson.toJson(content);
            stepStatusRequest.setContent(reqPayload, ContentType.APPLICATION_JSON);
            stepStatusRequest.execute();

            Exception newException = new Exception(String.format("Failed executing test %s/%s, step %s",
                    this.currentSessionStatus.currentTestPath,
                    this.currentSessionStatus.currentTestName,
                    stepNumber), ex);
            throw newException;
        } finally {
            this.currentAction = null;
        }
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        close();
    }

    private String getStringParameter(String parmeterName, String defaultValue) throws ParameterNotFoundException {
        String parameterValue = config.getProperty(parmeterName);
        if (parameterValue != null) {
            return parameterValue;
        } else if (defaultValue != null) {
            return defaultValue;
        } else {
            throw new ParameterNotFoundException(String.format("Parameter %s was not found", parmeterName));
        }
    }

    private String getStringParameter(String parmeterName) {
        return getStringParameter(parmeterName, null);
    }

    public File getTempDir() {
        return tempDir;
    }

    /**
     * Queries the sync service for the specified test asset file and returns an
     * input stream with the content of that asset.
     */
    public InputStream getTestAsset(String assetType, String partialPath) {
        // URL-encode the partial path
        String urlEncodedPartialPath = null;
        try {
            urlEncodedPartialPath = URLEncoder.encode(partialPath, "UTF-8");
        } catch (UnsupportedEncodingException ex) {
            throw new RuntimeException(String.format("Failed encoding partial path %s",
                    partialPath), ex);
        }

        // Prepare HTTP request
        String url = String.format(syncServiceBaseUrl + "/api/test-asset?type=%s&path=%s",
                assetType,
                urlEncodedPartialPath);
        HttpRequest request = new HttpRequest(url, HttpVerb.GET, this.httpProxy);

        try {
            request.execute();
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "An error occured while making the HTTP request to get %s asset %s from the sync service",
                    assetType,
                    partialPath), ex);
        }

        if (request.getResponseStatusCode() == 200) {
            try {
                return request.getResponseAsStream();
            } catch (Exception ex) {
                throw new RuntimeException(String.format(
                        "An error occured while retrieving the HTTP response input stream for %s asset %s from the sync service",
                        assetType,
                        partialPath), ex);
            }
        } else {
            throw new RuntimeException(String.format("Failed to get %s asset %s from the sync service. The HTTP status code was: %s. The HTTP body was: %s",
                    assetType,
                    partialPath,
                    request.getResponseStatusCode(),
                    request.getResponseAsString()));
        }
    }

    public String getType() {
        return this.actorType;
    }

    private MacroDefinition getMacroDefinition(String partialPath) {
        Yaml yaml = new Yaml();
        MacroDefinition def = yaml.loadAs(getTestAsset("macro", partialPath), MacroDefinition.class);
        return def;
    }

    private TestDefinition getTestDefinition(String partialPath) {
        Yaml yaml = new Yaml();
        TestDefinition def = yaml.loadAs(getTestAsset("test", partialPath), TestDefinition.class);

        // Account for usage of obsolete "index" property in the step definition
        // and just transfer its value to the correct property - "step".
        for (TestDefActor actor : def.actors) {
            for (TestDefStep step : actor.steps) {
                if (step.step == null) {
                    step.step = step.index;
                }
            }
        }
        return def;
    }

    private String getTestsDirFullPath() {
        // TODO: Read test-repo.yaml
        return Paths.get(testRepoLocation, testRepoDirName, "tests").toString();
    }

    private SessionStatusResponse getTestSessionStatus() {
        try {
            HttpRequest request = new HttpRequest(
                    String.format("%s/api/session/%s/status",
                            this.syncServiceBaseUrl,
                            this.currentSessionStatus.id),
                    HttpVerb.GET,
                    this.httpProxy);
            request.execute();
            int statusCode = request.getResponseStatusCode();

            if (statusCode < 300) {
                String responseString = request.getResponseAsString();
                if (responseString != null) {
                    JsonElement responseElement = new JsonParser().parse(responseString);
                    JsonObject responseObj = responseElement.getAsJsonObject();
                    SessionStatusResponse sessionStatus = new SessionStatusResponse();
                    sessionStatus.status = responseObj.get("status").getAsString();
                    if (sessionStatus.status.equals("started")) {
                        sessionStatus.currentTestIndex = responseObj.get("currentTestIndex").getAsInt();
                        sessionStatus.currentStepIndex = responseObj.get("currentStepIndex").getAsInt();
                        if (responseObj.has("currentDataRecordIndex")) {
                            try {
                                sessionStatus.currentDataRecordIndex = responseObj.get("currentDataRecordIndex").getAsInt();
                            } catch (Exception ex) {
                                sessionStatus.currentDataRecordIndex = null;
                            }
                        }
                        sessionStatus.currentIteration = responseObj.get("currentIteration").getAsInt();
                        sessionStatus.currentTestPath = responseObj.get("currentTestPath").getAsString();
                        sessionStatus.currentTestName = responseObj.get("currentTestName").getAsString();
                    }

                    return sessionStatus;
                }
            } else if (statusCode == 404) {
                // When we receive a 404, it means the session died
                abandonSession();
            }
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed to get or parse status data for session %s",
                    this.currentSessionStatus.id), ex);
        }

        return null;
    }

    /**
     * Logs the names, versions and commit SHAs of relevant JAR files.
     */
    private void logJarVersions() {
        Collection<File> jarFiles = null;

        List<JarFile> jars = new LinkedList<>();
        JarFile mainJar = JarUtil.getJarFile(TestActor.class);
        if (mainJar != null) {
            jars.add(mainJar);
            File mainJarFile = new File(mainJar.getName());
            jarFiles = FileUtils.listFiles(mainJarFile.getParentFile(), new String[]{"jar"}, true);
        } else {
            jarFiles = FileUtils.listFiles(new File("."), new String[]{"jar"}, true);
        }

        if (jarFiles != null && jarFiles.size() > 0) {
            Logger.info("File versions:");

            for (File childFile : jarFiles) {
                if (childFile.getName().matches("dtest.+\\.jar")) {
                    try {
                        JarFile jar = new JarFile(childFile);
                        Logger.info(String.format("  %s: %s %s",
                                new File(jar.getName()).getName(),
                                JarUtil.getManifestAttribute(jar, "Build-Time"),
                                JarUtil.getManifestAttribute(jar, "Implementation-Version")));
                    } catch (IOException ex) {
                        Logger.warning(String.format("Failed to determine version for JAR %s",
                                childFile.getName()));
                    }
                }
            }

            Logger.info("");
        }
    }

    private void publishSharedData(Map<String, Object> sharedData) throws IOException {
        HttpRequest request = new HttpRequest(
                String.format("%s/api/session/%s/test/%s/data",
                        this.syncServiceBaseUrl,
                        this.currentSessionStatus.id,
                        this.currentSessionStatus.currentTestIndex),
                HttpVerb.PUT,
                this.httpProxy);

        Gson gson = new GsonBuilder().create();
        String jsonData = gson.toJson(sharedData);
        request.setContent(jsonData, ContentType.APPLICATION_JSON);

        Logger.debug(String.format("Publishing shared data: %s", jsonData));
        request.execute();
    }

    private void publishSharedData(String name, Object value) throws IOException {
        Map<String, Object> sharedData = new HashMap<String, Object>();
        sharedData.put(name, value);
        publishSharedData(sharedData);
    }

    /**
     * Waits for the actorType to be acquired by a test session and does the
     * work for that one session, then returns.
     *
     * @param maxWaitTime Maximum time this test actorType will wait to be
     * acquired by a test session
     * @throws Exception
     */
    @Override
    public void runOneSession(Duration maxWaitTime) throws Exception {
        Duration waitTime = Duration.ofSeconds(0);

        if (this.currentSessionStatus == null) {
            log.info(String.format("Actor %s of type %s is waiting to be acquired by a test session%s...",
                    this.actorId,
                    this.actorType,
                    maxWaitTime != null
                            ? String.format(" (timeout is %s seconds)", maxWaitTime.getSeconds())
                            : ""));
        }

        // Wait until this actorType is acquired by a test session. The
        // currentTestSession field is populated in the announce thread which
        // is started in the constructor.
        while (this.currentSessionStatus == null) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
            }

            waitTime = waitTime.plus(Duration.ofMillis(1000));
            if (maxWaitTime != null && waitTime.compareTo(maxWaitTime) > 0) {
                log.info(String.format("The maximum wait time of %s seconds was exceeded while waiting for a test session to start",
                        maxWaitTime.getSeconds()));
                return;
            }
        }

        // Reset data file and macro caches
        this.dataFileCache = new HashMap<>();
        this.macroCache = new HashMap<>();

        HashMap<String, String> actorLogContext = new HashMap<String, String>();
        actorLogContext.put("actorId", actorId);
        actorLogContext.put("actorType", actorType);
        HttpLogger logger = new HttpLogger(
                this.syncServiceBaseUrl,
                this.currentSessionStatus.id,
                actorLogContext,
                this.httpProxy);
        this.log = logger;
        logger.setLevel(LogLevel.valueOf(config.getProperty("logLevel", "DEBUG")));

        this.log.info(String.format("Actor %s of type %s was acquired by test session %s",
                this.actorId,
                this.actorType,
                this.currentSessionStatus.id));

        Logger.setLogger(this.log);

        logJarVersions();

        // Start querying the session status and executing the tests/steps
        while (this.currentSessionStatus != null) {
            SessionStatusResponse sessionStatus = null;

            try {
                sessionStatus = this.getTestSessionStatus();
            } catch (Exception ex) {
                Logger.error("A critical error has happened. Please provide all potentially relevant data to the dev team for a fix.", ex);
                //TODO: Continue implementation to cover all edge cases
                return;
            }

            // TODO: If the session status returns null for a longer time, abandon session
            if (sessionStatus != null) {
                if (sessionStatus.status.equals("started")) {
                    // Update the iteration number and reset current test, if necessary
                    if (this.currentSessionStatus.currentIteration < sessionStatus.currentIteration) {
                        this.currentSessionStatus.currentIteration = sessionStatus.currentIteration;
                        this.currentSessionStatus.currentTestIndex = -1;
                        this.currentSessionStatus.currentStepIndex = -1;
                        this.currentStepIsCompleted = false;
                    }

                    // Update the index of the current test for this actorType and
                    // load the test definition
                    if (this.currentSessionStatus.currentTestIndex < sessionStatus.currentTestIndex) {

                        this.currentTest = null;
                        this.currentSessionStatus.currentTestIndex = sessionStatus.currentTestIndex;
                        this.currentSessionStatus.currentTestPath = sessionStatus.currentTestPath;
                        this.currentSessionStatus.currentTestName = sessionStatus.currentTestName;
                        this.currentSessionStatus.currentStepIndex = -1;

                        log.info("--------------------------------------------------");
                        log.info(String.format("Actor %s started executing test %s/%s...",
                                this.actorType,
                                this.currentSessionStatus.currentTestPath,
                                this.currentSessionStatus.currentTestName));

                        HttpRequest stepStatusRequest = new HttpRequest(
                                String.format("%s/api/session/%s/actor/%s/test/%s/step/%s",
                                        this.syncServiceBaseUrl,
                                        this.currentSessionStatus.id,
                                        this.actorId,
                                        this.currentSessionStatus.currentTestIndex,
                                        0),
                                HttpVerb.PUT,
                                this.httpProxy);

                        // Start step 0
                        stepStatusRequest.setContent("{\"status\":\"started\",\"result\":\"pending\"}", ContentType.APPLICATION_JSON);
                        stepStatusRequest.execute();

                        try {
                            // Initialize the script engine for this test
                            this.scriptEngine = createScriptEngine();

                            // Identify and parse the test definition file
                            this.currentTest = getTestDefinition(String.format("%s/%s",
                                    this.currentSessionStatus.currentTestPath,
                                    this.currentSessionStatus.currentTestName));

                            if (this.currentTest.dataSet != null) {
                                if (this.currentTest.dataSet instanceof String) {
                                    String expression = (String) this.currentTest.dataSet;
                                    String cleanedExpression = expression.replaceAll("^\\s*\\$script\\s*", "");
                                    Object evaledObj;
                                    try {
                                        evaledObj = this.scriptEngine.eval(cleanedExpression);
                                    } catch (Exception ex) {
                                        throw new RuntimeException(String.format(
                                                "Failed to evaluate the \"dataSet\" property of the data-driven test. The expression we evaluated was >>> %s <<<.",
                                                cleanedExpression), ex);
                                    }
                                    Object dataSetObj = this.convertToJavaType(evaledObj);
                                    if (dataSetObj instanceof List) {
                                        this.currentDataSet = (List) dataSetObj;
                                    } else {
                                        throw new RuntimeException(String.format(
                                                "The \"dataSet\" property of the data-driven test did not evaluate to a collection type. The expression we evaluated was >>> %s <<<.",
                                                cleanedExpression));
                                    }
                                } else if (this.currentTest.dataSet instanceof List) {
                                    int i = 0;
                                }
                            }

                            // Notify the sync service that step 0 of the test
                            // succeeded. Only send the dataRecordCount in step 0
                            // and only for data-driven tests.
                            String jsonContent;
                            if (this.currentDataSet != null
                                    && sessionStatus.currentDataRecordIndex != null
                                    && sessionStatus.currentDataRecordIndex == 0) {
                                
                                jsonContent = String.format(
                                        "{\"dataRecordCount\":%s,\"status\":\"completed\",\"result\":\"passed\"}",
                                        this.currentDataSet.size());
                            } else {
                                jsonContent = String.format(
                                        "{\"status\":\"completed\",\"result\":\"passed\"}");
                            }
                            stepStatusRequest.setContent(jsonContent, ContentType.APPLICATION_JSON);
                            stepStatusRequest.execute();
                        } catch (Exception ex) {
                            StringWriter sw = new StringWriter();
                            ex.printStackTrace(new PrintWriter(sw));
                            log.error((sw.toString()));

                            // Notify the sync service that step 0 of the test failed
                            stepStatusRequest.setContent("{\"status\":\"completed\",\"result\":\"failed\"}", ContentType.APPLICATION_JSON);
                            stepStatusRequest.execute();
                        }
                    }

                    if (this.currentSessionStatus.currentTestIndex == sessionStatus.currentTestIndex) {
                        // Update the current step index for the actorType
                        if (this.currentSessionStatus.currentStepIndex < sessionStatus.currentStepIndex) {
                            this.currentSessionStatus.currentStepIndex = sessionStatus.currentStepIndex;
                            currentStepIsCompleted = false;
                        }

                        if (!currentStepIsCompleted && this.currentSessionStatus.currentStepIndex == sessionStatus.currentStepIndex) {
                            currentStepIsCompleted = true;
                            try {
                                executeTestStep(sessionStatus.currentStepIndex);
                            } catch (Exception ex) {
                                Logger.error(ex);
                            }
                        }
                    }
                } else if (sessionStatus.status.equals("completed")) {
                    log.info(String.format("Test session %s has completed\n", this.currentSessionStatus.id));
                    this.currentSessionStatus = null;
                }
            }

            try {
                Thread.sleep(1000);
            } catch (InterruptedException ex) {
            }
        }
    }

    @Override
    public void runOneSession() throws Exception {
        runOneSession(null);
    }

    private void startAnnounceThread() {
        stopAnnounceThread();

        announceThread = new Thread() {
            public void run() {
                while (!actorIsStopping) {
                    announce();
                    try {
                        Thread.sleep(5000);
                    } catch (InterruptedException ex) {
                        break;
                    }
                }
            }
        };

        log.info(String.format("Connecting to sync service at %s...", syncServiceBaseUrl));
        announceThread.start();
    }

    private void stopAnnounceThread() {
        if (announceThread != null) {
            announceThread.interrupt();
        }
    }

    private void takeScreenShot(TestAction action, Integer stepNo, Integer actionNo, String screenShotType) {
        if (screenShotType == null) {
            screenShotType = "info";
        }

        try {
            InputStream screenshotStream = action.takeScreenshot();

            if (screenshotStream != null) {
                String workingDirString = System.getProperty("user.dir");
                String screenshotDirString = Paths.get(workingDirString, "work", "screenshots").toString();
                File screenshotDir = new File(screenshotDirString);
                if (!screenshotDir.exists()) {
                    screenshotDir.mkdirs();
                }

                // Test_name_(SID1500482267)_(S1,A0)_after.png
                File screenshotFile = new File(
                        screenshotDirString,
                        String.format("SID%s_%s_TEST%02d_ST%02d_AC%02d_%s.png",
                                this.currentSessionStatus.id,
                                this.actorType,
                                this.currentSessionStatus.currentTestIndex + 1,
                                stepNo != null ? stepNo : 0,
                                actionNo != null ? actionNo : 0,
                                //                                new SimpleDateFormat("hh-mm-ss").format(new Date()),
                                screenShotType));

                FileOutputStream outStream = new FileOutputStream(screenshotFile);
                IOUtils.copy(screenshotStream, outStream);
                screenshotStream.close();
                outStream.close();
                Logger.info(String.format("Captured screenshot at %s", screenshotFile.getAbsolutePath()));
            }
        } catch (Exception ex) {
            String actionType = action != null ? action.getClass().getName() : "(N/A)";
            Logger.error(String.format("Failed to capture screenshot for action %s.", actionType), ex);
        }
    }

    /**
     * Implementation of the $sharedData function exposed in JavaScript.
     */
    public class SharedDataFunction extends AbstractJSObject {

        public SharedDataFunction() {
        }

        @Override
        public boolean isFunction() {
            return true;
        }

        @Override
        public Object call(Object thiz, Object... args) {
            String propertyName = args[0].toString();

            if (args.length == 1) {
                String url = String.format("%s/api/session/%s/test/%s/data",
                        TestActor.this.syncServiceBaseUrl,
                        TestActor.this.currentSessionStatus.id,
                        TestActor.this.currentSessionStatus.currentTestIndex);

                try {
                    HttpRequest request = new HttpRequest(
                            url,
                            HttpVerb.GET,
                            TestActor.this.httpProxy);
                    request.execute();
                    String responseBody = request.getResponseAsString();
                    Map<String, Object> sharedData = new Gson().fromJson(responseBody, Map.class);
                    return sharedData.get(propertyName);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format("There was an error while requesting the test shared data from the sync service. HTTP request details: %s",
                            "GET " + url));
                }
            } else if (args.length == 2) {
                String propertyValue = args[1].toString();
                try {
                    TestActor.this.publishSharedData(propertyName, propertyValue);
                } catch (Exception ex) {
                    throw new RuntimeException(String.format(
                            "There was an error while publishing the test shared data to the sync service."), ex);
                }
            }

            return Undefined.getUndefined();
        }
    }
}

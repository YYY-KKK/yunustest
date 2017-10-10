package dtest.base.util;

import dtest.base.logging.Logger;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import org.apache.commons.io.FilenameUtils;

/**
 * Loads properties or YAML configuration files from disk or JAR resources and
 * allows clients to read or modify the configuration properties.
 */
public class Config {

    private Map<String, Object> store;

    public Config() {
        this.store = new HashMap();
    }

    public Config(Map<String, Object> store) {
        this.store = store;
    }

    public Map<String, Object> asMap() {
        return this.store;
    }

    public Object get(String propertyPath) {
        try {
            return getRecursive(propertyPath, this.store);
        } catch (Throwable ex) {
            throw new RuntimeException(String.format(
                    "Failed to read configuration property \"%s\".",
                    propertyPath), ex);
        }
    }

    public Object get(String propertyPath, Object defaultValue) {
        if (this.hasProperty(propertyPath)) {
            return get(propertyPath);
        } else {
            return defaultValue;
        }
    }

    public List getList(String propertyPath) {
        Object propertValue = get(propertyPath);
        if (propertValue instanceof List) {
            return (List) propertValue;
        } else {
            ArrayList<Object> list = new ArrayList<Object>();
            list.add(propertValue);
            return list;
        }
    }

    public List getList(String propertyPath, List defaultValue) {
        if (this.hasProperty(propertyPath)) {
            return this.getList(propertyPath);
        } else {
            return defaultValue;
        }
    }

    public String getString(String propertyPath) {
        return get(propertyPath).toString();
    }

    public String getString(String propertyPath, String defaultValue) {
        if (this.hasProperty(propertyPath)) {
            return this.getString(propertyPath);
        } else {
            return defaultValue;
        }
    }

    private Object getRecursive(String propertyPath, Map<String, Object> map) {
        Matcher matcher = StringUtil.executeRegex(propertyPath, "^(?<first>[^\\.]+)\\.?(?<rest>.+)?");

        if (matcher == null) {
            throw new RuntimeException(String.format(
                    "Failed to read configuration property \"%s\".",
                    propertyPath));
        }

        String firstPropertyName = matcher.group("first");
        String restOfExpression = matcher.group("rest");

        if (restOfExpression == null) {
            // Since there were no dots in the property path, it means that we
            // are dealing is a simple property name and not an expression

            if (map.containsKey(firstPropertyName)) {
                return map.get(firstPropertyName);
            } else {
                throw new RuntimeException(String.format(
                        "An attempt was made to read configuration property \"%s\", but this property was not defined.",
                        firstPropertyName));
            }
        } else {
            Object childObject = map.get(firstPropertyName);

            if (childObject instanceof Map) {
                return getRecursive(restOfExpression, (Map) childObject);
            } else {
                throw new RuntimeException(String.format(
                        "An attempt was made to read property \"%s\", from an "
                        + "object that is not a map. The object value was %s.",
                        restOfExpression,
                        childObject));
            }
        }
    }

    /**
     * Attempts to find the given configuration file, first in the path where
     * the main JAR is located then in the resources, loads it and returns an
     * input stream from the file or null, if the file is not found.
     */
    private static InputStream getConfigInputStream(String configFileName) throws FileNotFoundException, ClassNotFoundException {
        File jarDir = MainUtil.getMainJar().getParentFile();

        // If we're running the code in the IDE, it will not be packaged as JAR
        // and the CLASS files will reside in the "test-classes" directory. However,
        // the config file is found one directory up the path
        if (jarDir.getName().equals("test-classes")) {
            jarDir = jarDir.getParentFile();
        }

        File configFile = Paths.get(jarDir.getPath(), configFileName).toFile();
        if (configFile.exists()) {
            Logger.info(String.format(
                    "Loading configuration file \"%s\" from \"%s\"...",
                    configFileName,
                    configFile.getParent()));
            return new FileInputStream(configFile);
        } else {
            Class<?> mainClass = MainUtil.getMainClass();
            InputStream inputStream = mainClass.getResourceAsStream("/" + configFileName);
            if (inputStream != null) {
                Logger.info(String.format(
                    "Loading configuration file \"%s\" from JAR resources...",
                    configFileName));
            }
            return inputStream;
        }
    }

    public boolean hasProperty(String propertyPath) {
        try {
            return hasPropertyRecursive(propertyPath, this.store);
        } catch (Throwable ex) {
            throw new RuntimeException(String.format(
                    "Failed to verify existence of configuration property \"%s\".",
                    propertyPath), ex);
        }
    }
    
    private boolean hasPropertyRecursive(String propertyPath, Map<String, Object> map) {
        Matcher matcher = StringUtil.executeRegex(propertyPath, "^(?<first>[^\\.]+)\\.?(?<rest>.+)?");

        if (matcher == null) {
            return false;
        }

        String firstPropertyName = matcher.group("first");
        String restOfExpression = matcher.group("rest");

        if (restOfExpression == null) {
            // Since there were no dots in the property path, it means that we
            // are dealing is a simple property name and not an expression
            return map.containsKey(firstPropertyName);
        } else {
            Object childObject = map.get(firstPropertyName);
            
            if (childObject instanceof Map) {
                return hasPropertyRecursive(restOfExpression, (Map) childObject);
            } else {
                return false;
            }
        }
    }

    /**
     * Loads a configuration file from the given path or, if this is not
     * specified, from path where the main JAR/class is located.
     */
    public static Config load(String configFileName) {
        Config config = new Config();

        try {
            InputStream fileInputStream;
            String extension;
            
            // Temporary code to provide backward compatibility with .properties
            // config files. To be changed once we've decide to stop supporting
            // .properties files.
            String propertiesFileName = String.format(
                    "%s.properties",
                    FilenameUtils.getBaseName(configFileName));
            fileInputStream = getConfigInputStream(propertiesFileName);
            if (fileInputStream != null) {
                extension = "properties";
            } else {
                fileInputStream = getConfigInputStream(configFileName);
                extension = FilenameUtils.getExtension(configFileName);
            }

            if (extension.equalsIgnoreCase("properties")) {
                config.store = readPropertiesFile(fileInputStream);
            } else if (extension.equalsIgnoreCase("yaml")) {
                config.store = readYamlFile(fileInputStream);
            } else {
                throw new RuntimeException(String.format(
                        "Failed to load configuration file \"%s\". Supported "
                        + "formats are \".properties\" and \".yaml\"",
                        configFileName));
            }

            return config;
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to load configuration file \"%s\". Make sure the file exists and the file contents syntax is valid.",
                    configFileName), ex);
        }
    }

    public static Config loadYaml(String yamlData) {
        Object yamlObject = Factory.getYaml().load(yamlData);
        if (yamlObject instanceof Map) {
            return new Config((Map) yamlObject);
        } else {
            throw new RuntimeException(String.format(
                    "Failed to load configuration data in YAML format. The YAML "
                    + "data could not be interpreted as a map."));
        }
    }

    /**
     * Converts a Properties objects into a Map.
     */
    private static Map<String, Object> readPropertiesFile(InputStream fileInputStream) throws IOException {
        Map<String, Object> result = new HashMap<String, Object>();
        Properties prop = new Properties();
        prop.load(fileInputStream);
        for (final String name : prop.stringPropertyNames()) {
            result.put(name, prop.getProperty(name));
        }
        return result;
    }

    /**
     * Converts a Properties objects into a Map.
     */
    private static Map<String, Object> readYamlFile(InputStream fileInputStream) throws IOException {
        Object yamlObject = Factory.getYaml().load(fileInputStream);
        return (Map<String, Object>) yamlObject;
    }

    public void set(String propertyPath, Object propertyValue) {
        this.store.put(propertyPath, propertyValue);
    }
}

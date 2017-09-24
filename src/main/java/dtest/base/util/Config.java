package dtest.base.util;

import dtest.base.logging.Logger;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
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
        if (this.store.containsKey(propertyPath)) {
            return this.store.get(propertyPath);
        } else {
            throw new RuntimeException(String.format(
                    "An attempt was made to read configuration property \"%s\", but this property was not defined.",
                    propertyPath));
        }
    }

    public Object get(String propertyPath, Object defaultValue) {
        if (this.hasProperty(propertyPath)) {
            return this.store.get(propertyPath);
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

    /**
     * Attempts to find the given configuration file, first in the path where
     * the main JAR is located then in the resources, loads it and returns an
     * input stream from the file or null, if the file is not found.
     */
    private static InputStream getConfigInputStream(String propertiesFileName) throws FileNotFoundException, ClassNotFoundException {
        File jarDir = MainUtil.getMainJar().getParentFile();

        // If we're running the code in the IDE, it will not be packaged as JAR
        // and the CLASS files will reside in the "test-classes" directory. However,
        // the config file is found one directory up the path
        if (jarDir.getName().equals("test-classes")) {
            jarDir = jarDir.getParentFile();
        }

        File configFile = Paths.get(jarDir.getPath(), propertiesFileName).toFile();
        if (configFile.exists()) {
            return new FileInputStream(configFile);
        } else {
            Logger.info(String.format(
                    "Loading configuration file \"%s\" from JAR resources...",
                    propertiesFileName));
            Class<?> mainClass = MainUtil.getMainClass();
            return mainClass.getResourceAsStream("/" + propertiesFileName);
        }
    }

    public boolean hasProperty(String propertyPath) {
        if (this.store.containsKey(propertyPath)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Loads a configuration file from the given path or, if this is not
     * specified, from path where the main JAR/class is located.
     */
    public static Config load(String propertiesFileName) {
        Config config = new Config();

        try {
            InputStream fileInputStream = getConfigInputStream(propertiesFileName);

            String extension = FilenameUtils.getExtension(propertiesFileName);

            if (extension.equalsIgnoreCase("properties")) {
                config.store = readPropertiesFile(fileInputStream);
            } else {
                config.store = readYamlFile(fileInputStream);
            }

            return config;
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to load configuration file \"%s\"",
                    propertiesFileName), ex);
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

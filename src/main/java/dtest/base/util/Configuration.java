package dtest.base.util;

import dtest.base.logging.Logger;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.Properties;

public class Configuration {

    /**
     * Loads a configuration file from the given path or, if this is not 
     * specified, from path where the main class is located.
     */
    public static Properties getConfiguration(String propertiesFileName, String propertiesFilePath) {
        try {
            File propFile;

            if (propertiesFilePath != null) {
                propFile = Paths.get(propertiesFilePath, propertiesFileName).toFile();
            } else {
                File jarDir = MainUtil.getMainJar().getParentFile();

                // If we're running the code in the IDE, it will not be packaged as JAR
                // and the CLASS files will reside in the "test-classes" directory. However,
                // the config file is found one directory up the path
                if (jarDir.getName().equals("test-classes")) {
                    jarDir = jarDir.getParentFile();
                }

                propFile = new File(jarDir, propertiesFileName);
            }

            InputStream fileInputStream;

            try {
                fileInputStream = new FileInputStream(propFile);
            } catch (Exception ex) {
                Logger.warning("Loading configuration from JAR resources...");
                Class<?> mainClass = MainUtil.getMainClass();
                fileInputStream = mainClass.getResourceAsStream("/" + propertiesFileName);
            }

            Properties prop = new Properties();
            prop.load(fileInputStream);
            return prop;
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed to load configuration file %s", propertiesFileName), ex);
        }
    }

    public static Properties getConfiguration(String propertiesFileName) {
        return getConfiguration(propertiesFileName, null);
    }
}

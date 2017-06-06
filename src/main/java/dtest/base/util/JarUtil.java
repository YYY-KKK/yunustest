package dtest.base.util;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.security.CodeSource;
import java.util.jar.Attributes;
import java.util.jar.JarFile;

public class JarUtil {

    /**
     * Returns the JarFile instance corresponding to the JAR containing the
     * specified class.
     */
    public static JarFile getJarFile(Class klass) {
        try {
            CodeSource src = klass.getProtectionDomain().getCodeSource();
            if (src != null) {
                URL jarUrl = src.getLocation();
                return new JarFile(new File(jarUrl.getPath()));
            } else {
                return null;
            }
        } catch (IOException ex1) {
            return null;
        }
    }

    /**
     * Returns the a manifest attribute from the JAR file containing
     * the specified class.
     */
    public static String getManifestAttribute(Class klass, String attributeName) {
        Attributes manifestInfo = getManifestAttributes(klass);
        String version = manifestInfo.getValue(attributeName);
        if (version != null) {
            return version;
        } else {
            return "N/A";
        }
    }
    
    /**
     * Returns a manifest attribute from a JAR file.
     */
    public static String getManifestAttribute(JarFile jar, String attributeName) {
        Attributes manifestInfo = getManifestAttributes(jar);
        String version = manifestInfo.getValue(attributeName);
        if (version != null) {
            return version;
        } else {
            return "N/A";
        }
    }

    /**
     * Returns all manifest attributes from the JAR file containing
     * the specified class.
     */
    public static Attributes getManifestAttributes(Class klass) {
        JarFile jar = getJarFile(klass);
        return getManifestAttributes(jar);
    }

    /**
     * Returns all manifest attributes from a JAR file.
     */
    public static Attributes getManifestAttributes(JarFile jar) {
        try {
            return jar.getManifest().getMainAttributes();
        } catch (IOException ex1) {
            return new Attributes();
        }
    }
}

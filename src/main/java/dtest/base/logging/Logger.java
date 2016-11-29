package dtest.base.logging;

import dtest.base.contracts.ILogger;
import java.io.PrintWriter;
import java.io.StringWriter;

public class Logger {

    private static ILogger INSTANCE;

    static {
        INSTANCE = new ConsoleLogger();
    }

    public static void setLogger(ILogger loger) {
        INSTANCE = loger;
    }

    public static void debug(String text) {
        INSTANCE.debug(text);
    }
    
    public static void error(String text) {
        INSTANCE.error(text);
    }

    public static void error(Throwable exception) {
        INSTANCE.error(getStackTrace(exception));
    }
    
    public static void error(String message, Throwable exception) {
        INSTANCE.error(message);
        INSTANCE.error(getStackTrace(exception));
    }

    public static String getStackTrace(Throwable exception) {
        StringWriter sw = new StringWriter();
        exception.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }
    
    public static void info(String text) {
        INSTANCE.info(text);
    }

    public static void trace(String text) {
        INSTANCE.trace(text);
    }
    
    public static void warning(String text) {
        INSTANCE.warning(text);
    }
    
    public static void warning(String message, Throwable exception) {
        INSTANCE.warning(message);
        INSTANCE.warning(getStackTrace(exception));
    }
}

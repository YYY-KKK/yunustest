package dtest.util;

import dtest.base.ConsoleLogger;
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

    public static void error(String text) {
        INSTANCE.error(text);
    }

    public static void error(Throwable exception) {
        StringWriter sw = new StringWriter();
        exception.printStackTrace(new PrintWriter(sw));
        String exceptionInfo = sw.toString();
        
        INSTANCE.error(exceptionInfo);
    }

    public static void info(String text) {
        INSTANCE.info(text);
    }

    public static void warning(String text) {
        INSTANCE.warning(text);
    }
}

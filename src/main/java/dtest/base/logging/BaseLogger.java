package dtest.base.logging;

import dtest.base.contracts.ILogger;
import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Defines the methods for logging information for each log level and some of
 * the general behavior like the prefixes that should be outputted to the log
 * depending on the log level of the log entry. Derived classes can decide what
 * to do with the logged text by implementing the writeLogEntry method.
 */
public abstract class BaseLogger implements ILogger {

    private LogLevel level;

    BaseLogger() {
        this.level = LogLevel.INFO;
    }

    @Override
    public void debug(String text) {
        if (level.getValue() <= LogLevel.DEBUG.getValue()) {
            writeLogEntry(text, LogLevel.DEBUG);
        }
    }

    @Override
    public void error(String text) {
        if (level.getValue() <= LogLevel.ERROR.getValue()) {
            writeLogEntry(text, LogLevel.ERROR);
        }
    }

    @Override
    public void error(String message, Throwable exception) {
        this.error(message);
        this.error(BaseLogger.getStackTrace(exception));
    }

    public LogLevel getLevel() {
        return level;
    }

    protected String getPrefixForLevel(LogLevel level) {
        String prefix;

        switch (level) {
            case DEBUG:
                prefix = "DEBUG: ";
                break;
            case INFO:
                prefix = "";
                break;
            case ERROR:
                prefix = "ERROR: ";
                break;
            case WARN:
                prefix = "WARN: ";
                break;
            case TRACE:
                prefix = "TRACE: ";
                break;
            default:
                prefix = "";
        }

        return prefix;
    }

    public static String getStackTrace(Throwable exception) {
        StringWriter sw = new StringWriter();
        exception.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    @Override
    public void info(String text) {
        if (level.getValue() <= LogLevel.INFO.getValue()) {
            writeLogEntry(text, LogLevel.INFO);
        }
    }

    public void setLevel(LogLevel level) {
        this.level = level;
    }

    @Override
    public void trace(String text) {
        if (level.getValue() <= LogLevel.TRACE.getValue()) {
            writeLogEntry(text, LogLevel.TRACE);
        }
    }

    @Override
    public void warning(String text) {
        if (level.getValue() <= LogLevel.WARN.getValue()) {
            writeLogEntry(text, LogLevel.WARN);
        }
    }

    @Override
    public void warning(String message, Throwable exception) {
        this.warning(message);
        this.warning(BaseLogger.getStackTrace(exception));
    }

    protected abstract void writeLogEntry(String text, LogLevel level);
}

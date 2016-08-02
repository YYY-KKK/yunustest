package dtest.base;

import dtest.contracts.ILogger;

/**
 * Logger that prints log entries to the console
 */
public class ConsoleLogger implements ILogger {
	enum LogLevel { ERROR, INFO, WARNING }
	
	public ConsoleLogger() {
	}
	
	private void createLogEntry(LogLevel level, String text) {
		System.out.println(text);
	}
	
	public void error(String text) {
		createLogEntry(LogLevel.ERROR, "ERROR: " + text);
	}

	public void info(String text) {
		createLogEntry(LogLevel.INFO, text);
	}

	public void warning(String text) {
		createLogEntry(LogLevel.WARNING, "WARNING: " + text);
	}
}

package dtest.contracts;

public interface ILogger {
	public void error(String text);
	
	public void info(String text);
	
	public void warning(String text);
}

package dtest.base.contracts;

public interface ILogger {

    public void debug(String text);
    
    public void error(String text);
    
    public void error(String message, Throwable exception);

    public void info(String text);

    public void trace(String text);
    
    public void warning(String text);
    
    public void warning(String message, Throwable exception);
}

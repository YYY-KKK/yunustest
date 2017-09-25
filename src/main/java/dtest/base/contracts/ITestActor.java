package dtest.base.contracts;

import java.io.File;
import java.io.InputStream;
import java.time.Duration;
import java.util.Observer;

public interface ITestActor {

    public void addObserver(Observer o);

    public void close();

    public void deleteObserver(Observer o);
    
    /**
     *
     * Evaluates a script using the test actor's script engine and returns the
     * result of the evaluation.
     */
    public Object evalScript(String script);

    /**
     * Returns the temporary directory used by the test actor. This is where
     * test actions can store temporary files and any kind of persistent data.
     */
    File getTempDir();

    /**
     * Returns a test asset of the given type (test definition, macro, data
     * file, image, etc) by requesting it from the sync service.
     */
    InputStream getTestAsset(String assetType, String partialPath);

    public String getType();

    public void injectVariable(String varName, Object varValue);

    public Exception runOneSession(Duration maxWaitTime);

    public Exception runOneSession();
}

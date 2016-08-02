package dtest.contracts;

import java.time.Duration;

public interface ITestActor {

    public void close();
    
    public void runOneSession(Duration maxWaitTime) throws Exception;

    public void runOneSession() throws Exception;
}

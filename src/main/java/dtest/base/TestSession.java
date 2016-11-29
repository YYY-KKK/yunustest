package dtest.base;

public class TestSession {

    public String id;

    public int currentStepIndex;

    public int currentTestIndex;

    public String currentTestName;

    public String currentTestPath;

    public TestSession(String testSessionId) {
        this.id = testSessionId;
        this.currentStepIndex = -1;
        this.currentTestIndex = -1;
        this.currentTestName = null;
        this.currentTestPath = null;
    }

    public TestSession(TestSession session) {
        this.id = session.id;
        this.currentStepIndex = session.currentStepIndex;
        this.currentTestIndex = session.currentTestIndex;
        this.currentTestName = session.currentTestName;
        this.currentTestPath = session.currentTestPath;
    }
}

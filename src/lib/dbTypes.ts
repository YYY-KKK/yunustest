/** Stores an actor's state in the context of a test session */
export interface ActorSessionState extends TestActor {
    tests: ActorSessionTestState[];
}

/** Stores a test's state for an actor in the context of a test session */
export interface ActorSessionTestState {
    currentStepIndex: number;
    steps: TestStepInfo[];
    name: string,
    path: string,
    timeStarted: number;
    timeCompleted: number;
}

export interface MemDbAdapter {
    deleteActor(actorId): Promise<number>;
    deleteMemSession(sessionId): Promise<number>;
    getActor(actorId): Promise<TestActor>;
    getActorsBySession(sessionId): Promise<TestActor[]>;
    getActorsByType(actorType?: string): Promise<TestActor[]>;
    getMemSessions(): Promise<TestSessionInfo[]>;
    getMemSession(sessionId): Promise<TestSessionInfo>;
    initMemoryDb(options?: Object);
    insertActor(actorId, actorType: string): Promise<TestActor>;
    insertMemSession(sessionId, label: string): Promise<TestSessionInfo>;
    resetMemoryDb();
    updateActor(actorId, newData: Object): Promise<number>;
    updateActorStep(sessionId, actorId, testIndex: number, stepIndex: number, newData: Object);
    updateMemSession(sessionId, newData: Object): Promise<number>;
}

export interface PersistentDbAdapter {
    deleteArchivedSession(sessionId: number): Promise<number>;
    getArchivedSessions(): Promise<TestSessionInfo[]>;
    getArchivedSession(sessionId: number): Promise<TestSessionInfo>;
    initPersistentDb(options?: Object);
    insertArchivedSession(sessionId: number, label: string): Promise<TestSessionInfo>;
    resetPersistentDb();
    updateArchivedSession(sessionId: number, newData: Object): Promise<number>;
}

/** Stores the state for an actor in the context of a test session */

export interface SessionTestActor extends TestActor {
    tests: ActorSessionTestState[];
}

export interface StepUpdateInfo {
    details: any,
    result: string;
    status: string;
}

export interface TestActor {
    id: number,
    lastSeenTime: number,
    testSessionId: number,
    ip?: string,
    type: string
}

/** Stores all the relevant information about a test session, including its actors,
 * current test and current step, timestamps, status, etc.  */
export interface TestSessionInfo {
    id: number,
    label: string,
    actors: {},
    currentIteration: number,
    currentTestIndex: number,
    currentStepIndex: number,
    iterations: number,
    result: string,
    status: string,
    tests: TestStatus[],
    timeCreated: number,
    timeStarted: number,
    timeCompleted: number,
    lastActivity: number
}

export interface TestStatus {
    currentIteration: number,
    currentStepIndex: number;
    /** Test name */
    name: string;
    /** Test path */
    path: string;
    result: string;
    sharedData: Object;
    status: string,
    steps: TestStepInfo[];
    timeStarted: number;
    timeCompleted: number;
}

export interface TestStepInfo {
    index: number,
    status: string,
    result: string,
    timeStarted: number;
    timeCompleted: number;
}
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
    getActorsByType(actorType?: string, actorTags?: string[]): Promise<TestActor[]>;
    getMemSessions(options?: QueryOptions): Promise<TestSessionInfo[]>;
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

export interface QueryOptions {
    limit?: number,
    skip?: number
}

export interface SessionTemplate {
    id: number,
    label: string,
    maxIterations: number,
    tests: TestAssetName[],
    organization?: number,
    user?: number,
    userGroup?: number,
}

/** Stores the state for an actor in the context of a test session */
export interface SessionTestActor extends TestActor {
    tests: ActorSessionTestState[];
}

export interface StepActionInfo {
    actorType: string,
    action: string,
    args?: { [key: string]: string },
    description: string,
    duration?: number,
    durationMs: number,
    macro: string,
    result?: string,
    step: number
}

/** This is the data coming from test actors when they update the status of a test step.  */
export interface StepUpdateInfo {
    actions?: StepActionInfo[],
    /** In step 0 of data-driven tests, actors report the total number of data records available. This field stores that number. */
    dataRecordCount?: number,
    result: string;
    stackTrace?: any,
    status: string;
}

/** The runtime context of data-driven iteration subtests.*/
export interface SubtestContext {
    actions: StepActionInfo[];
    /** The index of the current data record in a
     * data-driven test */
    currentDataRecordIndex?: number;
    /** The 1-based iteration number */
    currentIteration: number;
    result: string;
    /** The data store for test-scoped shared data */
    sharedData?: any;
    status: string;
    steps: TestStepInfo[];
    timeStarted?: number;
    timeCompleted?: number;
}

export interface TestActor {
    id: number,
    lastSeenTime: number,
    testSessionId: number,
    ip?: string,
    type: string,
    tags: string[]
}

export interface TestAssetName {
    /** Test asset file name */
    name: string;
    /** Test asset path relative to the asset directory ("tests" dir, "data" dir, etc.) */
    path: string;
}

/** The runtime context of regular tests and of containers
 * for data-driven iteration subtests. */
export interface TestContext extends SubtestContext {
    /** The 0-based index of the current test step */
    currentStepIndex: number;
    /** The total number of data records available in
     * the data set of a data-driven test */
    dataRecordCount?: number;
    isDataDriven: boolean;
    /** Test file name */
    name: string;
    /** Test path relative to the tests directory */
    path: string;
    /** The list of data-driven iteration subtests */
    subtests?: SubtestContext[];
}

/** Stores information about a test. */
export interface TestInfo extends TestAssetName {
    actors?: string[],
    dataDriven: boolean,
    dataRecordNo?: number,
    hash?: string,
    name: string,
    path: string,
    steps?: number[]
}

/** Stores the information that is necessary to start a test session */
export interface TestSessionProperties {
    actorTags: string[],
    dataDirNames?: string[],
    maxIterations: number,
    sessionLabel: string,
    tests: TestAssetName[]
}

/** Stores all the relevant information about a test session, including its actors, current test and current step, timestamps, status, etc.  */
export interface TestSessionInfo {
    actorTags?: string[],
    id: number,
    label: string,
    lastActivity: number,
    actors: {},
    currentDataRecordIndex?: number,
    currentIteration: number,
    currentTestIndex: number,
    currentStepIndex: number,
    maxIterations: number,
    result: string,
    /** The data store for session-scoped shared data */
    sessionData?: any,
    status: string,
    tests: TestContext[],
    timeCreated: number,
    timeStarted: number,
    timeCompleted: number
}

export interface TestStepInfo {
    index: number,
    status: string,
    result: string,
    timeStarted?: number;
    timeCompleted?: number;
}
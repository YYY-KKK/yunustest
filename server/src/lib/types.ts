export interface ActorGroup {
    name: string,
    actorTags: string
    maxParallelSessions?: number
}

/** Stores an actor's state in the context of a test session */
export interface ActorSessionState extends TestActor {
    tests: ActorSessionTestState[];
}

/** Stores a test's state for an actor in the context of a test session */
export interface ActorSessionTestState {
    currentSegmentIndex: number;
    segments: TestSegmentInfo[];
    name: string,
    path: string,
    timeStarted: number;
    timeCompleted: number;
}

/** The structure of the response returned by the create session API(s). */
export interface CreateSessionResult {
    sessionId: number,
    missingTests: TestAssetName[]
}

export interface DbAdapter {
    deleteActor(actorId): Promise<number>;
    deleteSession(sessionId): Promise<number>;
    getActor(actorId): Promise<TestActor>;
    getActorsBySession(sessionId): Promise<TestActor[]>;
    getActorsByTypeAndTags(actorType?: string, actorTags?: string[]): Promise<TestActor[]>;
    getSessions(options?: QueryOptions): Promise<TestSessionInfo[]>;
    getSession(sessionId): Promise<TestSessionInfo>;
    initDb(options?: Object);
    insertActor(actorId, actorType: string): Promise<TestActor>;
    insertSession(sessionId, label: string): Promise<TestSessionInfo>;
    resetDb();
    updateActor(actorId, newData: Object): Promise<number>;
    updateActorSegment(sessionId, actorId, testIndex: number, segmentIndex: number, newData: Object);
    updateSession(sessionId, newData: Object): Promise<number>;
}

/** An error type that allows passing the error name in the constructor,
 * in addition to the error message. */
export class ErrorWithName extends Error {
    constructor(message: string, name: string) {
        super(message);
        this.name = name;
    }
}

export interface QueryOptions {
    limit?: number,
    skip?: number
}

export interface SegmentActionInfo {
    /** Fully-qualified name of the Java class implementing this action */
    action: string,
    actorType: string,
    args?: { [key: string]: string },
    description: string,
    duration?: number,
    durationMs: number,
    isCheckpoint?: boolean,
    /** The macro this action is currently executing into. */
    macro: string,
    /** The sequence of macros that led to executing this action. */
    macroStack: string[],
    result?: string,
    screenshot: string,
    segment: number
    /** This property was deprecated in favor of "segment" and will be removed. */
    step: number
    /** The stack trace information captured in the case of failed actions. */
    stackTrace: string
}

/** This is the data coming from test actors when they update the status of a test segment. */
export interface SegmentUpdateInfo {
    actions?: SegmentActionInfo[],
    /** In segment 0 of data-driven tests, actors report the total number of
     * data records available. This field stores that number. */
    dataRecordCount?: number,
    result: string;
    stackTrace?: any,
    status: string;
}

/** Stores the state for an actor in the context of a test session */
export interface SessionTestActor extends TestActor {
    tests: ActorSessionTestState[];
}

/** The runtime context of data-driven iteration subtests.*/
export interface SubtestContext {
    actions: SegmentActionInfo[];
    checkpointFailed?: boolean,
    /** The index of the current data record in a
     * data-driven test */
    currentDataRecordIndex?: number;
    /** The 1-based iteration number */
    currentIteration: number;
    /** Valid values: pending, cancelled, failed, passed */
    result: string;
    /** The data store for test-scoped shared data */
    sharedData?: any;
    /** Valid values: started, acquiring-actors, completed */
    status: string;
    segments: TestSegmentInfo[];
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
    /** The 0-based index of the current test segment */
    currentSegmentIndex: number;
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
    tags: string[];
}

/** Stores information about a test. */
export interface TestInfo extends TestAssetName {
    actors?: string[],
    dataDriven: boolean,
    dataRecordNo?: number,
    hash?: string,
    name: string,
    path: string,
    segments?: number[],
    tags: string[]
}


export interface TestSegmentInfo {
    index: number,
    status: string,
    result: string,
    timeStarted?: number;
    timeCompleted?: number;
}

/** Stores all the relevant information about a test session, including its
 * actors, current test and current segment, timestamps, status, etc.  */
export interface TestSessionInfo {
    actors: {},
    actorTags?: string[],
    currentDataRecordIndex?: number,
    currentIteration: number,
    currentTestIndex: number,
    currentSegmentIndex: number,
    testCounts?: {
        cancelled: number,
        completed: number,
        failed: number,
        passed: number,
        pending: number,
        skipped: number,
        total: number
    },
    environment?: string,
    id: number,
    label: string,
    lastActivity: number,
    maxIterations: number,
    /** Valid values: pending, cancelled, failed, passed */
    result: string,
    /** The data store for session-scoped shared data */
    sessionData?: any,
    /** Valid values: started, acquiring-actors, completed */
    status: string,
    tests: TestContext[],
    timeCreated: number,
    timeStarted: number,
    timeCompleted: number
}

/** Stores the information that is necessary to start a test
 * session. */
export interface TestSessionProperties {
    actorTags?: string[],
    environment?: string,
    maxIterations?: number,
    sessionLabel?: string,
    tests: TestAssetName[]
}

/** Defines the structure of a test session template. */
export interface TestSessionTemplate extends TestSessionProperties {
    name?: string;
    path?: string;
    includeTestsWithTags?: string,
    includeTestsFromDirs?: string[],
    includeTestsFromTemplates?: TestAssetName[],
    excludeTestsWithTags?: string,
    excludeTestsFromDirs?: string[],
    excludeTestsFromTemplates?: TestAssetName[]
}
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

export interface QueryOptions {
    limit?: number,
    skip?: number
}

export interface SegmentActionInfo {
    actorType: string,
    action: string,
    args?: { [key: string]: string },
    description: string,
    duration?: number,
    durationMs: number,
    macro: string,
    result?: string,
    segment: number
    /** This property is to be removed */
    step: number
}

/** This is the data coming from test actors when they update the status of a test segment.  */
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
    /** The index of the current data record in a
     * data-driven test */
    currentDataRecordIndex?: number;
    /** The 1-based iteration number */
    currentIteration: number;
    result: string;
    /** The data store for test-scoped shared data */
    sharedData?: any;
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
}

/** Stores information about a test. */
export interface TestInfo extends TestAssetName {
    actors?: string[],
    dataDriven: boolean,
    dataRecordNo?: number,
    hash?: string,
    name: string,
    path: string,
    segments?: number[]
}

/** Stores all the relevant information about a test session, including its
 * actors, current test and current segment, timestamps, status, etc.  */
export interface TestSessionInfo {
    actorTags?: string[],
    environment?: string,
    id: number,
    label: string,
    lastActivity: number,
    actors: {},
    currentDataRecordIndex?: number,
    currentIteration: number,
    currentTestIndex: number,
    currentSegmentIndex: number,
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

/** Stores the information that is necessary to start a test
 * session (also known as a test session template) */
export interface TestSessionProperties {
    actorTags: string[],
    environment?: string,
    maxIterations: number,
    sessionLabel: string,
    tests: TestAssetName[]
}

export interface TestSegmentInfo {
    index: number,
    status: string,
    result: string,
    timeStarted?: number;
    timeCompleted?: number;
}
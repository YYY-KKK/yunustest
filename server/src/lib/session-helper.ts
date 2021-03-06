import * as _ from 'underscore';
import * as actorHelper from './actor-helper';
import * as buildInfo from './build-info';
import * as configLoader from '../lib/config-loader';
import * as constants from '../lib/constants';
import * as dbManager from '../lib/db-manager'
import * as dirs from './dirs';
import * as helpers from '../lib/helpers';
import * as AsyncLock from 'async-lock';
import * as logManager from '../lib/log-manager';
import * as  moment from 'moment';
import * as notifier from './websocket-notifier';
import * as path from 'path';
import * as sessionHelper from '../lib/session-helper';
import * as testRepo from '../lib/test-repo';
import {
    ActorSessionState,
    ActorSessionTestState,
    CreateSessionResult,
    ErrorWithName,
    SessionTestActor,
    SubtestContext,
    TestAssetName,
    TestInfo,
    TestSessionProperties,
    TestContext,
    TestSessionInfo,
    TestSegmentInfo
} from './types';
import * as util from 'util';
import { fstat } from 'fs';

let cleanupIntervalId;
const newSessionIdLockKey = "newSessionIdLockKey";
const lock = new AsyncLock();

/** Cancel test sessions that are not making any progress or cannot find the
 * required test actors. */
async function cleanupSessions() {
    await cleanupSessionHistory();

    const db = dbManager.getDb();
    const sessions = await db.getSessions();
    const now = Date.now();
    const config = configLoader.getConfig();

    for (let session of sessions) {
        if (session.status === constants.testSessionStatus.ACQUIRING_ACTORS) {
            // Cancel session if it stays in ACQUIRING_ACTORS status for too long
            if (session.timeCreated &&
                config.acquireActorsTimeoutSec !== 0 &&
                now - session.timeCreated > config.acquireActorsTimeoutSec * 1000) {

                await cancelSession(session);
                logManager.getSessionLog(session.id).info(helpers.format(
                    'Cancelling session {0} because we were unable to acquire the necessary test actors in {1} seconds',
                    session.id,
                    config.acquireActorsTimeoutSec
                ));
            }
        } else if (session.status === constants.testSessionStatus.STARTED) {
            // Cancel session if the test actors don't report any activity for too long
            if (session.lastActivity &&
                config.noActivityTimeoutSec !== 0 &&
                now - session.lastActivity > config.noActivityTimeoutSec * 1000) {

                await cancelSession(session);
                logManager.getSessionLog(session.id).info(helpers.format(
                    'Cancelling session {0} because there was no activity for {1} seconds',
                    session.id,
                    config.noActivityTimeoutSec
                ));
            }
        }
    }
}

async function cleanupSessionInfo(sessionId: number) {
    const db = dbManager.getDb();

    const session = await db.getSession(sessionId);

    if (session.status != constants.testSessionStatus.COMPLETED) {
        // We only clean-up completed sessions
        return;
    }

    // Delete screenshots
    if (session) {
        for (const test of session.tests || []) {
            for (const action of test.actions || []) {
                if (action.screenshot) {
                    helpers.deleteFile(path.join(dirs.screenshotDir(), action.screenshot));
                }
            }
        }
    }

    // Delete record in sessions database
    await db.deleteSession(sessionId);

    // Delete log file
    helpers.deleteFile(path.join(dirs.logsDir(), `${sessionId.toString()}.log`));
}

/** Delete session information, including logs and screenshots, based on
 * session creation date and total number of sessions stored. */
async function cleanupSessionHistory() {
    const db = dbManager.getDb();
    const sessions = await db.getSessions();
    const config = configLoader.getConfig();

    // Make sure we don't drop below config.sessionHistoryMinCount
    if (sessions.length <= (config.sessionHistoryMinCount || 50)) {
        return;
    }

    // Delete all sessions above config.sessionHistoryMaxCount
    const sessionsAboveMaxCount = sessions.slice(config.sessionHistoryMaxCount || 500);
    for (const sessionToDelete of sessionsAboveMaxCount.reverse()) {
        cleanupSessionInfo(sessionToDelete.id);
    }

    // Delete all sessions above config.sessionHistoryAgeDays
    const sessionsToExamine = sessions.slice(
        config.sessionHistoryMinCount,
        config.sessionHistoryMaxCount || 500);
    const now = Date.now();
    for (const sessionToExamine of sessionsToExamine.reverse()) {
        const sessionAgeInDays = (now - sessionToExamine.timeCreated) / 1000 / 60 / 60 / 24;
        if (sessionAgeInDays > config.sessionHistoryAgeDays) {
            cleanupSessionInfo(sessionToExamine.id);
        } else {
            break;
        }
    }
}

export async function cancelSession(testSession: TestSessionInfo) {
    const db = dbManager.getDb();
    const now = Date.now();

    // Free test actors
    try {
        let actors = await db.getActorsBySession(testSession.id);
        await Promise.all(actors.map(function (actor) {
            return db.updateActor(actor.id, { testSessionId: null });
        }));
    } catch (err) { }

    // Mark test session and its pending tests as cancelled
    {
        // Mark incomplete tests as cancelled
        var updatedTests = testSession.tests;
        for (let sessionTest of updatedTests) {
            if (sessionTest.status !== constants.testStatus.COMPLETED) {
                sessionTest.result = constants.testResult.CANCELLED;
                sessionTest.status = constants.testStatus.COMPLETED;
            }
        }

        // Update the test session object's properties
        testSession.result = constants.testSessionResult.CANCELLED;
        testSession.status = constants.testSessionStatus.COMPLETED;
        testSession.tests = updatedTests;
        testSession.timeCompleted = now;

        // Write the changes to the DB
        await db.updateSession(testSession.id, {
            result: testSession.result,
            status: testSession.status,
            tests: testSession.tests,
            timeCompleted: testSession.timeCompleted
        });
    }

    notifier.onSessionStatusChanged(testSession.id, testSession.status);
}

export async function cancelSessionById(sessionId: number) {
    const db = dbManager.getDb();
    const testSession = await db.getSession(sessionId);
    await cancelSession(testSession);
}

/** Perform the various cleanup and finalization activities
 * necessary at the end of a test session. */
export async function completeSession(testSession: TestSessionInfo, sessionResult?) {
    const db = dbManager.getDb();
    sessionResult = sessionResult || constants.testSessionResult.CANCELLED;
    const now = Date.now();

    // Free test actors
    try {
        let actors = await db.getActorsBySession(testSession.id);
        await Promise.all(actors.map(function (actor) {
            return db.updateActor(actor.id, { testSessionId: null });
        }));
        notifier.onActorsChanged(null);
    } catch (err) { }

    // Mark test session as complete and its not completed tests as cancelled
    {
        // Mark incomplete tests as cancelled
        var updatedTests = testSession.tests;
        for (let sessionTest of updatedTests) {
            if (sessionTest.status !== constants.testStatus.COMPLETED) {
                sessionTest.result = constants.testResult.CANCELLED;
                sessionTest.status = constants.testStatus.COMPLETED;
            }
        }

        // Update the test session object's properties
        testSession.result = sessionResult;
        testSession.status = constants.testSessionStatus.COMPLETED;
        testSession.tests = updatedTests;
        testSession.timeCompleted = now;

        // Write the changes to the DB
        await db.updateSession(testSession.id, {
            result: testSession.result,
            status: testSession.status,
            tests: testSession.tests,
            timeCompleted: testSession.timeCompleted
        });
    }

    notifier.onSessionStatusChanged(testSession.id, testSession.status);
}

/** Iterates through all the test actors, collects the status and result of the
 * current test segment for each actor and computes an aggregate TestSegmentInfo object. */
function computeCurrentTestSegmentInfo(testSession: TestSessionInfo): TestSegmentInfo {
    let currentSegmentPassed = true;
    let currentSegmentWasCompleted = true;
    let actorIds = Object.keys(testSession.actors);
    let actor, actorTest: ActorSessionTestState, segment;

    for (let actorIdIndex = 0; actorIdIndex < actorIds.length; ++actorIdIndex) {
        actor = testSession.actors[actorIds[actorIdIndex]];
        actorTest = actor.tests[testSession.currentTestIndex];

        if (actorTest && actorTest.segments) {
            segment = actorTest.segments[testSession.currentSegmentIndex];

            if (!segment) {
                currentSegmentWasCompleted = false;
                currentSegmentPassed = false;
                break;
            } else {
                if (segment.status !== constants.segmentStatus.COMPLETED) {
                    currentSegmentWasCompleted = false;
                    currentSegmentPassed = false;
                } else {
                    if (segment.result !== constants.segmentResult.PASSED) {
                        currentSegmentPassed = false;
                    }
                }
            }
        } else {
            currentSegmentWasCompleted = false;
        }
    }

    return {
        index: testSession.currentSegmentIndex,
        result: currentSegmentPassed ?
            constants.segmentResult.PASSED :
            constants.segmentResult.PENDING,
        status: currentSegmentWasCompleted ?
            constants.segmentStatus.COMPLETED :
            constants.segmentStatus.PENDING
    };
}

/** Create a test session according to the specified session properties object. */
export async function createSession(sessionProps: TestSessionProperties): Promise<CreateSessionResult> {
    sessionProps.maxIterations = sessionProps.maxIterations || 1;

    return new Promise<CreateSessionResult>(async function (resolve, reject) {
        const sessionId = await getNewSessionId();

        // Create session logger
        const log = logManager.getSessionLog(sessionId);

        const buildInfoObj = buildInfo.getBuildInfo();
        log.debug(helpers.format("Sync server version: {0} {1} {2}",
            buildInfoObj.version,
            buildInfoObj.buildDate,
            buildInfoObj.commitSha));

        try {
            let missingTests: TestAssetName[] = [];

            const testInfos = testRepo.getTestInfos(sessionProps.tests);
            if (testInfos.length === 0) {
                throw new ErrorWithName(
                    `The test session contained no valid test names. The session properties were: ${JSON.stringify(sessionProps)}`,
                    constants.error.NO_MATCHING_TESTS);
            }

            // Build the missingTests array
            if (testInfos.length < sessionProps.tests.length) {
                const allTests = testRepo.getAllTestInfos();
                for (const test of sessionProps.tests) {
                    if (!testRepo.containsAsset(allTests, test)) {
                        missingTests.push(test);
                    }
                }
            }

            let rawActors = [];
            const sessionTests: TestContext[] = [];
            const config = configLoader.getConfig();

            for (const testInfo of testInfos) {
                if (!testRepo.containsAsset(testRepo.getAllTestInfos(), { name: testInfo.name, path: testInfo.path })) {
                    missingTests.push(testInfo);
                    continue;
                }

                addTestToSession(sessionTests, testInfo);
            }

            const requiredActors = _.union(rawActors).sort();
            const actorsInfo = requiredActors.map(function (a) {
                return { actorType: a, actorTags: sessionProps.actorTags, acquired: false };
            });

            const acquireActorsTimeout = config.acquireActorsTimeoutSec * 1000;
            const startAcquireTimeout = 1000;

            const db = dbManager.getDb();
            await db.insertSession(sessionId, sessionProps.sessionLabel || "Session " + sessionId.toString());
            await db.updateSession(sessionId, {
                actorTags: sessionProps.actorTags,
                environment: (sessionProps.environment || '').trim(),
                maxIterations: sessionProps.maxIterations,
                tests: sessionTests
            });

            const startAcquireActorsTime = Date.now();
            const sessionActors = {};
            /** Indicates whether the message about the maximum number of
             *  parallel sessions was already written to the log. */
            let didLogMaxParallelSessions = false;

            const tagsSuffix = sessionProps.actorTags && sessionProps.actorTags.length ?
                " [" + sessionProps.actorTags.join(', ') + "]" :
                "";
            log.info(helpers.format('Acquiring actors for session {0}: {1}{2}',
                sessionId,
                requiredActors.join(', '),
                tagsSuffix));

            notifier.onSessionStatusChanged(sessionId, constants.testSessionStatus.ACQUIRING_ACTORS);

            await acquireActors();

            resolve({ sessionId, missingTests });

            async function acquireActors() {
                //TODO: Check that the test session is not cancelled. If it is, free all acquired actors and return.
                const session = await db.getSession(sessionId);

                if (!session || session.status === constants.testSessionStatus.COMPLETED) {
                    return;
                }

                try {
                    // Identify available actors to run this test session
                    actorsInfoLoop: for (let a of actorsInfo) {
                        if (!a.acquired) {
                            const allAcquiredActors = (await db.getActorsByTypeAndTags(null, null))
                                .filter(a => a.testSessionId);

                            let testActor = _.find(
                                await db.getActorsByTypeAndTags(a.actorType, a.actorTags),
                                (actor) => !actor.testSessionId);

                            if (testActor) {
                                // Ensure actor groups have not reached the maximum parallel sessions
                                for (const actorGroup of config.actorGroups) {
                                    if (actorHelper.isActorInGroup(testActor, actorGroup)) {
                                        const acquiredActorsInGroup = actorHelper.getActorsInGroup(allAcquiredActors, actorGroup);
                                        if (acquiredActorsInGroup.length >= (actorGroup.maxParallelSessions || Number.MAX_VALUE)) {
                                            if (!didLogMaxParallelSessions) {
                                                didLogMaxParallelSessions = true;
                                                log.info(
                                                    `Maximum number of parallel sessions for actor group "${actorGroup.name || actorGroup.actorTags || ''}" is ` +
                                                    `${actorGroup.maxParallelSessions} and it was already reached. Waiting for actor(s) to finish existing sessions...`);
                                            }
                                            continue actorsInfoLoop;
                                        }
                                    }
                                }

                                await db.updateActor(testActor.id, { testSessionId: sessionId });

                                // Make sure the update to the database happened and the actor is now
                                // acquired by this session. It could be that a different session got
                                // to it before the call to updateActor finished.
                                testActor = await db.getActor(testActor.id);
                                if (testActor && testActor.testSessionId === sessionId) {
                                    const sessionActor: SessionTestActor = {
                                        ...testActor,
                                        tests: []
                                    };
                                    sessionActors[sessionActor.id] = sessionActor;
                                    a.acquired = true;
                                    notifier.onActorsChanged(testActor.id);
                                }
                            }
                        }
                    }

                    const allActorsAcquired = actorsInfo.filter(function (a) { return !a.acquired; })[0] == undefined;
                    if (allActorsAcquired) {
                        await startTestSession();
                    } else {
                        if (Date.now() - startAcquireActorsTime < acquireActorsTimeout) {
                            setTimeout(acquireActors, startAcquireTimeout);
                        }
                    }
                } catch (err) {
                    console.error(err, err.stack);
                }
            }

            function addTestToSession(
                sessionTests, testInfo: TestInfo) {

                rawActors = rawActors.concat(testInfo.actors);

                const sessionTest: TestContext = {
                    actions: [],
                    currentIteration: 1,
                    currentSegmentIndex: 0,
                    isDataDriven: testInfo.dataDriven,
                    name: testInfo.name,
                    path: testInfo.path,
                    result: constants.testResult.PENDING,
                    status: constants.testStatus.PENDING,
                    segments: [],
                    tags: testInfo.tags || []
                };

                if (sessionTest.isDataDriven) {
                    sessionTest.currentDataRecordIndex = 0;
                }

                const maxSegmentIndex = Math.max.apply(null, testInfo.segments);

                for (let segmentIndex = 0; segmentIndex <= maxSegmentIndex; ++segmentIndex) {
                    sessionTest.segments.push({
                        index: segmentIndex,
                        result: constants.segmentResult.PENDING,
                        status: constants.segmentStatus.PENDING
                    });
                }

                sessionTests.push(sessionTest);
            }

            async function startTestSession() {
                log.info(helpers.format('Session {0} with label "{1}" started at {2} UTC',
                    sessionId,
                    sessionProps.sessionLabel,
                    moment().utc().format('YYYY-MM-DD HH:mm:ss')));

                await db.updateSession(sessionId, {
                    actors: sessionActors,
                    status: constants.testSessionStatus.STARTED
                });

                notifier.onSessionStatusChanged(sessionId, constants.testSessionStatus.STARTED);
            }
        } catch (err) {
            log.error(JSON.stringify(err));
            reject(err);
        }
    });
}

/** Returns a promise which resolves to a new unique session ID. */
function getNewSessionId() {
    return new Promise<number>(function (resolve, reject) {
        lock.acquire(newSessionIdLockKey, async function (done) {
            try {
                const db = dbManager.getDb();

                // Identify an available session ID
                let sessionId = Math.round(moment().valueOf() / 1000);
                while (await db.getSession(sessionId) != null) {
                    sessionId++;
                }

                resolve(sessionId);
            } catch (err) {
                reject(err);
            } finally {
                done();
            }
        });
    });
}

/** Increments the session iteration number and resets session state to
 * prepare for running the next iteration */
function incrementIteration(testSession: TestSessionInfo) {
    // Only continue if there's at least one failed test
    let firstFailedTestIndex = testSession.tests.findIndex((t) => t.result === constants.testResult.FAILED);
    if (firstFailedTestIndex === -1) { return; }

    ++testSession.currentIteration;

    // Reset data for failed tests, both for session and for the session actors
    for (let testIndex = 0; testIndex < testSession.tests.length; ++testIndex) {
        let test = testSession.tests[testIndex];

        if (test.result === constants.testResult.FAILED) {
            resetTestStatus(testSession, testIndex);
            test.currentIteration = testSession.currentIteration;
        }
    }

    testSession.currentTestIndex = firstFailedTestIndex;
    testSession.currentSegmentIndex = 0;
    testSession.currentDataRecordIndex = 0;

    notifier.onSessionStatusChanged(testSession.id, testSession.status);
}

/** Creates a default subtest object that has its mandatory fields populated
 * with sensible default values. */
export function newSubtest(
    currentIteration: number = 1,
    result = constants.testResult.PENDING,
    status = constants.testStatus.PENDING): SubtestContext {

    return {
        actions: [],
        currentIteration: currentIteration,
        result: result,
        status: status,
        segments: []
    }
}

/** Iterates through all the tests in the session and populates the "testCounts"
 * property of the test session object with the data collected. */
export function populateCounts(session: TestSessionInfo) {
    let total = 0;
    let completed = 0, pending = 0;
    let passed = 0, failed = 0, skipped = 0, cancelled = 0;

    for (const test of session.tests) {
        if (test.subtests && test.subtests.length) {
            // This is a data-driven test
            for (const subTest of test.subtests) {
                incrementCounts(subTest);
            }
        } else {
            // This is a regular test
            incrementCounts(test);
        }
    }

    session.testCounts = {
        cancelled, completed, failed, passed, pending, skipped, total
    };

    function incrementCounts(test: SubtestContext) {
        total++;

        if (test.status === constants.testStatus.COMPLETED) {
            completed++;
        } else {
            pending++;
        }

        if (test.result === constants.testResult.PASSED) {
            passed++;
        } else if (test.result === constants.testResult.FAILED) {
            failed++;
        } else if (test.result === constants.testResult.SKIPPED) {
            skipped++;
        } else if (test.result === constants.testResult.CANCELLED) {
            cancelled++;
        }
    }
}

/** Resets the test status and all related fields. For all test actors,
 * resets the status and result of all the test segments for the specified
 * test to "pending". */
function resetTestStatus(testSession: TestSessionInfo, testIndex: number) {
    let test = testSession.tests[testIndex];

    test.actions = [];
    test.checkpointFailed = false;
    test.currentDataRecordIndex = 0;
    test.timeStarted = null;
    test.timeCompleted = null;
    test.sharedData = {};
    test.result = constants.testResult.PENDING;
    test.status = constants.testStatus.PENDING;

    // Reset test segments for actors for the current test index
    for (let actorId of Object.keys(testSession.actors)) {
        let actor: ActorSessionState = testSession.actors[actorId];
        actor.tests[testIndex].currentSegmentIndex = -1;
        actor.tests[testIndex].timeStarted = null;
        actor.tests[testIndex].timeCompleted = null;
        for (let segment of actor.tests[testIndex].segments) {
            segment.result = constants.segmentResult.PENDING;
            segment.status = constants.segmentStatus.PENDING;
            segment.timeStarted = null;
            segment.timeCompleted = null;
        }
    }
}

export function startCleanupInterval() {
    const config = configLoader.getConfig();
    const cleanupSessionsInterval = (config.cleanupSessionsIntervalSec || 10) * 1000;
    cleanupIntervalId = setInterval(cleanupSessions, cleanupSessionsInterval);
}

export function stopCleanupInterval() {
    clearInterval(cleanupIntervalId);
}

/** Update the status of a test segment using the supplied arguments and also
 * making sure the update makes sense (e.g. can't start a segment before the
 * previous one is completed, etc.) */
export function updateActorSegmentStatus(
    testSession: TestSessionInfo,
    actorId: any,
    testIndex: number,
    segmentIndex: number,
    newStatus: string) {

    actorId = parseInt(actorId);
    let sessionActor: ActorSessionState = testSession.actors[actorId];
    var actorTest = sessionActor.tests[testIndex];

    if (!actorTest) {
        actorTest = sessionActor.tests[testIndex] = {
            currentSegmentIndex: -1,
            segments: [],
            name: testSession.tests[testIndex].name,
            path: testSession.tests[testIndex].path,
            timeCompleted: null,
            timeStarted: Date.now()
        };
    }

    var currentSegment: TestSegmentInfo = actorTest.segments[actorTest.currentSegmentIndex];

    switch (newStatus) {
        case constants.segmentStatus.STARTED:
            let now = Date.now();

            // Make sure we're not starting the same segment twice
            if (segmentIndex === actorTest.currentSegmentIndex) {
                throw new Error(util.format('Cannot start segment %s because it was already started',
                    segmentIndex));
            }

            // Make sure the current segment is complete
            if (currentSegment && (currentSegment.status !== constants.segmentStatus.COMPLETED)) {
                throw new Error(util.format('Cannot start segment %s because the current segment is not complete yet',
                    segmentIndex));
            }

            // Update session start time
            if (!testSession.timeStarted) {
                testSession.timeStarted = now;
            }

            let test = testSession.tests[testIndex];

            // Update current test start time
            if (!test.timeStarted) {
                test.timeStarted = now;
            }

            actorTest.currentSegmentIndex = segmentIndex;

            actorTest.segments[actorTest.currentSegmentIndex] = {
                index: actorTest.currentSegmentIndex,
                status: constants.segmentStatus.STARTED,
                timeStarted: Date.now(),
                timeCompleted: null,
                result: constants.segmentResult.PENDING
            }

            if (!test.segments[actorTest.currentSegmentIndex].timeStarted) {
                test.segments[actorTest.currentSegmentIndex].timeStarted = now;
            }
            break;
        case constants.segmentStatus.COMPLETED:
            // Make sure we're completing the current segment and not something else
            if (segmentIndex !== actorTest.currentSegmentIndex) {
                throw new Error(util.format('Cannot complete segment %s because it is not the current segment (segment %s). Actor: %s. Test session: %s. Test index: %s',
                    segmentIndex,
                    actorTest.currentSegmentIndex,
                    actorId,
                    testSession.id,
                    testIndex));
            }

            currentSegment.status = constants.segmentStatus.COMPLETED;
            currentSegment.timeCompleted = Date.now();
            break;
        default:
            throw new Error(util.format('Unknown segment status "%s". Valid status values are: %s',
                newStatus,
                Object.keys(constants.segmentStatus)
                    .map((k) => { return '"' + constants.segmentStatus[k] + '"'; })
                    .join(', ')));
    }
}

/** Updates the current test index and current segment index for a session based
 * on the status reported by actors for the current test segment */
export function updateSessionState(testSession: TestSessionInfo) {
    let self = this;

    const currentSegmentInfo = computeCurrentTestSegmentInfo(testSession);

    // Check if the current segment for the current test was completed on all actors
    var currentSegmentWasCompleted = (currentSegmentInfo.status === constants.segmentStatus.COMPLETED);
    var currentSegmentPassed = (currentSegmentInfo.result === constants.segmentResult.PASSED);

    var currentTestDef = testSession.tests[testSession.currentTestIndex];
    var lastSegmentIndex = Math.max.apply(null, currentTestDef.segments.map(function (s) {
        return s.index;
    }));

    // Check if the last segment for the current test was completed and advance to the next test
    if (currentSegmentWasCompleted) {
        var currentTest = testSession.tests[testSession.currentTestIndex];
        var currentSegment = currentTest.segments[testSession.currentSegmentIndex];

        currentSegment.status = constants.segmentStatus.COMPLETED;
        currentSegment.result = currentSegmentPassed ? constants.segmentResult.PASSED : constants.segmentResult.FAILED;
        currentSegment.timeCompleted = Date.now();

        let reachedLastSegment = (testSession.currentSegmentIndex >= lastSegmentIndex);

        if (reachedLastSegment || !currentSegmentPassed) {
            const now = Date.now();

            if (currentTest.isDataDriven) {
                const currentSubtestPassed = currentSegmentPassed && !currentTest.checkpointFailed;
                currentTest.subtests = currentTest.subtests || [];
                const subtest = Object.assign(newSubtest(), {
                    actions: currentTest.actions,
                    checkpointFailed: currentTest.checkpointFailed,
                    currentDataRecordIndex: currentTest.currentDataRecordIndex,
                    currentIteration: currentTest.currentIteration,
                    result: currentSubtestPassed
                        ? constants.testResult.PASSED
                        : constants.testResult.FAILED,
                    status: constants.testStatus.COMPLETED,
                    segments: currentTest.segments,
                    timeStarted: currentTest.timeStarted,
                    timeCompleted: now
                });

                currentTest.subtests[currentTest.currentDataRecordIndex] = subtest;
            }

            const reachedLastDataRecord =
                !currentTest.isDataDriven ||
                currentTest.currentDataRecordIndex >= (currentTest.dataRecordCount || 0) - 1;

            if (reachedLastDataRecord) {
                currentTest.status = constants.testStatus.COMPLETED;
                if (currentTest.isDataDriven) {
                    const allSubtestsPassed =
                        currentTest.subtests.every(s => s.result == constants.testResult.PASSED);
                    currentTest.result = allSubtestsPassed ?
                        constants.testResult.PASSED :
                        constants.testResult.FAILED;
                } else {
                    currentTest.result = currentSegmentPassed && !currentTest.checkpointFailed ?
                        constants.testResult.PASSED :
                        constants.testResult.FAILED;
                }
                currentTest.timeCompleted = now;

                // Advance to the next test with status "pending"
                let nextTestIndex = testSession.currentTestIndex;
                while (
                    testSession.tests[nextTestIndex] &&
                    testSession.tests[nextTestIndex].status &&
                    testSession.tests[nextTestIndex].status !== constants.testStatus.PENDING &&
                    nextTestIndex <= testSession.tests.length) {

                    ++nextTestIndex;
                }
                testSession.currentTestIndex = nextTestIndex;
                testSession.currentDataRecordIndex = -1;
            } else {
                // Advance data record index for the current test to the next
                // entry that previously failed and reset the test status
                let nextDataRecordIndex = currentTest.currentDataRecordIndex + 1;
                while (
                    currentTest.subtests &&
                    currentTest.subtests[nextDataRecordIndex] &&
                    currentTest.subtests[nextDataRecordIndex].result !== constants.testResult.FAILED &&
                    nextDataRecordIndex < currentTest.subtests.length - 1) {

                    ++nextDataRecordIndex;
                }

                if (nextDataRecordIndex >= 0) {
                    resetTestStatus(testSession, testSession.currentTestIndex);
                    currentTest.currentDataRecordIndex = nextDataRecordIndex;
                    testSession.currentDataRecordIndex = nextDataRecordIndex;
                }
            }

            testSession.currentSegmentIndex = 0;

            let reachedLastTest = (testSession.currentTestIndex >= testSession.tests.length);

            if (reachedLastTest) {
                let allTestsPassed = testSession.tests.every(function (test) {
                    if (test.isDataDriven) {
                        return test.subtests.every(function (t2) {
                            return t2.result === constants.testResult.PASSED;
                        });
                    } else {
                        return test.result === constants.testResult.PASSED;
                    }
                });

                //TODO: 1/23 This section needs to be pulled out of this function. We don't want any DB updates in here.
                if (allTestsPassed) {
                    sessionHelper.completeSession(testSession, constants.testSessionResult.PASSED);
                } else {
                    if (testSession.currentIteration < testSession.maxIterations) {
                        incrementIteration(testSession);
                    } else {
                        sessionHelper.completeSession(testSession, constants.testSessionResult.FAILED);
                    }
                }
            }
        } else {
            ++testSession.currentSegmentIndex;
        }
    }

    notifier.onSessionProgress(testSession.id);
}

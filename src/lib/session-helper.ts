import * as _ from 'underscore';
import * as configLoader from '../lib/configLoader';
import * as constants from '../lib/constants';
import { db, memDb } from '../lib/db';
import * as helpers from '../lib/helpers';
import * as logManager from '../lib/log-manager';
import * as  moment from 'moment';
import * as path from 'path';
import { ScriptEngine } from '../lib/script-engine';
import * as sessionHelper from '../lib/session-helper';
import * as testRepo from '../lib/testRepo';
import {
    ActorSessionState,
    SessionTestActor,
    TestInfo,
    TestSessionProperties,
    TestContext,
    TestSessionInfo,
    TestStepInfo
} from './types';
import * as util from 'util';

let cleanupIntervalId;

async function cleanupSessions() {
    let sessions = await memDb.getMemSessions();
    let now = Date.now();
    let config = configLoader.getConfig();

    for (let session of sessions) {
        if (session.status === constants.testSessionStatus.ACQUIRING_ACTORS) {
            // Cancel session if it stays in ACQUIRING_ACTORS status for too long
            if (session.timeCreated &&
                config.acquireActorsTimeoutSec !== 0 &&
                now - session.timeCreated > config.acquireActorsTimeoutSec * 1000) {

                await cancelSession(session.id);
                logManager.getSessionLog(session.id).info(helpers.format(
                    'Cancelling session {0} because we were unable to aqcuire the necessary test actors in {1} seconds',
                    session.id,
                    config.acquireActorsTimeoutSec
                ));
            }
        } else if (session.status === constants.testSessionStatus.STARTED) {
            // Cancel session if the test actors don't report any activity for too long
            if (session.lastActivity &&
                config.noActivityTimeoutSec !== 0 &&
                now - session.lastActivity > config.noActivityTimeoutSec * 1000) {

                await cancelSession(session.id);
                logManager.getSessionLog(session.id).info(helpers.format(
                    'Cancelling session {0} because there was no activity for {1} seconds',
                    session.id,
                    config.noActivityTimeoutSec
                ));
            }
        }
    }
}

export async function cancelSession(sessionId) {
    sessionId = parseInt(sessionId);
    let now = Date.now();

    // Free test actors
    try {
        let actors = await memDb.getActorsBySession(sessionId);
        await Promise.all(actors.map(function (actor) {
            return memDb.updateActor(actor.id, { testSessionId: null });
        }));
    } catch (err) { }

    { // Mark test session and its pending tests as cancelled
        let testSession = await memDb.getMemSession(sessionId);

        if (!testSession) {
            throw new Error(helpers.format('Session ID {0} was not found', sessionId));
        }

        // Mark incomplete tests as cancelled
        var sessionTests = testSession.tests;
        for (let sessionTest of sessionTests) {
            if (sessionTest.status !== constants.testStatus.COMPLETED) {
                sessionTest.result = constants.testResult.CANCELLED;
                sessionTest.status = constants.testStatus.COMPLETED;
            }
        }

        // Write session changes
        await memDb.updateMemSession(sessionId, {
            result: constants.testSessionResult.CANCELLED,
            status: constants.testSessionStatus.COMPLETED,
            tests: sessionTests,
            timeStarted: now,
            timeCompleted: now
        });
    }
}

/** Perform the various cleanup and finalization activities
 * necessary at the end of a test session. */
export async function completeSession(sessionId, sessionResult?) {
    sessionId = parseInt(sessionId);
    sessionResult = sessionResult || constants.testSessionResult.CANCELLED;
    let now = Date.now();

    // Free test actors
    try {
        let actors = await memDb.getActorsBySession(sessionId);
        await Promise.all(actors.map(function (actor) {
            return memDb.updateActor(actor.id, { testSessionId: null });
        }));
    } catch (err) { }

    { // Mark test session as complete and its pending tests as cancelled
        let testSession = await memDb.getMemSession(sessionId);

        if (!testSession) {
            throw new Error(helpers.format('Session ID {0} was not found', sessionId));
        }

        // Mark incomplete tests as cancelled
        var sessionTests = testSession.tests;
        for (let sessionTest of sessionTests) {
            if (sessionTest.status !== constants.testStatus.COMPLETED) {
                sessionTest.result = constants.testResult.CANCELLED;
                sessionTest.status = constants.testStatus.COMPLETED;
            }
        }

        // Write session changes
        await memDb.updateMemSession(sessionId, {
            result: sessionResult,
            status: constants.testSessionStatus.COMPLETED,
            tests: sessionTests,
            timeCompleted: now
        });
    }
}

/** Create a test session according to the specified session properties object */
export async function createSession(template: TestSessionProperties): Promise<number> {
    template.maxIterations = template.maxIterations || 1;
    template.sessionLabel = template.sessionLabel || Math.round(Date.now() / 1000).toString();

    return new Promise<number>(async function (resolve, reject) {
        // Identify an available session ID
        let sessionId = Math.round(moment().valueOf() / 1000);
        while (await memDb.getMemSession(sessionId) != null) {
            ++sessionId;
        }

        // Create session logger
        const log = logManager.getSessionLog(sessionId);

        try {
            const testInfos = testRepo.getTestInfos(template.tests);
            if (testInfos.length === 0) {
                throw new Error(helpers.format(
                    "Session template contained no tests. The session template was: {0}",
                    JSON.stringify(template)));
            }

            let rawActors = [];
            const sessionTests: TestContext[] = [];
            const config = configLoader.getConfig();

            for (const testInfo of testInfos) {
                // Read test info from local repo
                const localTestInfo = testRepo.allTestInfos.find((t) => {
                    return t.name === testInfo.name && t.path === testInfo.path
                });

                addTestToSession(sessionTests, testInfo);

                function addTestToSession(
                    sessionTests, testInfo: TestInfo) {

                    rawActors = rawActors.concat(testInfo.actors);

                    const sessionTest: TestContext = {
                        actions: [],
                        currentIteration: 1,
                        currentStepIndex: 0,
                        isDataDriven: testInfo.dataDriven,
                        name: testInfo.name,
                        path: testInfo.path,
                        result: constants.testResult.PENDING,
                        status: constants.testStatus.PENDING,
                        steps: []
                    };

                    if (sessionTest.isDataDriven) {
                        sessionTest.currentDataRecordIndex = 0;
                    }

                    const maxStepIndex = Math.max.apply(null, testInfo.steps);

                    for (let stepIndex = 0; stepIndex <= maxStepIndex; ++stepIndex) {
                        sessionTest.steps.push({
                            index: stepIndex,
                            result: constants.stepResult.PENDING,
                            status: constants.stepStatus.PENDING
                        });
                    }

                    sessionTests.push(sessionTest);
                }
            }

            const requiredActors = _.union(rawActors).sort();
            const actorsInfo = requiredActors.map(function (a) {
                return { actorType: a, actorTags: template.actorTags, acquired: false };
            });

            const acquireActorsTimeout = config.acquireActorsTimeoutSec * 1000;
            const startAcquireTimeout = 1000;

            const startAquireTime = Date.now();

            await memDb.insertMemSession(sessionId, template.sessionLabel || sessionId.toString());
            await memDb.updateMemSession(sessionId, {
                actorTags: template.actorTags,
                maxIterations: template.maxIterations,
                tests: sessionTests
            });

            const startAcquireActorsTime = Date.now();
            const sessionActors = {};

            const tagsSuffix = template.actorTags && template.actorTags.length ?
                " [" + template.actorTags.join(', ') + "]":
                "";
            log.info(helpers.format('Acquiring actors for session {0}: {1}{2}',
                sessionId,
                requiredActors.join(', '),
                tagsSuffix));
            await acquireActors();

            resolve(sessionId);

            async function acquireActors() {
                //TODO: Check that the test session is not cancelled. If it is, free all acquired actors and return.
                const session = await memDb.getMemSession(sessionId);

                if (!session || session.status === constants.testSessionStatus.COMPLETED) {
                    return;
                }

                try {
                    // Identify available actors to run this test session
                    for (let a of actorsInfo) {
                        if (!a.acquired) {
                            const testActor = _.find(await memDb.getActorsByType(a.actorType, a.actorTags), function (actor) {
                                return !actor.testSessionId;
                            });

                            if (testActor) {
                                await memDb.updateActor(testActor.id, { testSessionId: sessionId });
                                const dbActor = await memDb.getActor(testActor.id);
                                if (dbActor.testSessionId === sessionId) {
                                    const sessionActor: SessionTestActor = {
                                        ...testActor,
                                        tests: []
                                    };
                                    sessionActors[sessionActor.id] = sessionActor;
                                    a.acquired = true;
                                }
                            }
                        }
                    }

                    const allActorsAquired = actorsInfo.filter(function (a) { return !a.acquired; })[0] == undefined;
                    if (allActorsAquired) {
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

            async function cancelTestSession(sessionId) {
                await memDb.updateMemSession(sessionId, {
                    actors: sessionActors,
                    result: constants.testSessionResult.CANCELLED,
                    status: constants.testSessionStatus.COMPLETED,
                    timeCompleted: Date.now()
                });
            }

            async function startTestSession() {
                log.info(helpers.format('Session {0} ("{1}") started at {2} UTC',
                    sessionId,
                    template.sessionLabel,
                    moment().utc().format('YYYY-MM-DD HH:mm:ss')));

                await memDb.updateMemSession(sessionId, {
                    actors: sessionActors,
                    status: constants.testSessionStatus.STARTED
                });
            }
        } catch (err) {
            log.error(JSON.stringify(err));
            reject(err);
        }
    });
}

/** Increments the session iteration number and resets session state to
 * prepare for running the next iteration */
function incrementIteration(testSession: TestSessionInfo) {
    // Only continue if there's at least one failed test
    let firstFailedTestIndex = testSession.tests.findIndex((t) => t.result === constants.testResult.FAILED);
    if (firstFailedTestIndex === -1) { return; }

    // Reset data for failed tests, both for session and for the session actors
    for (let testIndex = 0; testIndex < testSession.tests.length; ++testIndex) {
        let test = testSession.tests[testIndex];

        if (test.result === constants.testResult.FAILED) {
            resetTestStatus(testSession, testIndex);
        }
    }

    ++testSession.currentIteration;
    testSession.currentTestIndex = firstFailedTestIndex;
    testSession.currentStepIndex = 0;
    testSession.currentDataRecordIndex = 0;
}

/** Iterates through all the test actors, collects the status and result of the
 * current test step for each actor and computes an aggregate TestStepInfo object. */
function computeCurrentTestStepInfo(testSession: TestSessionInfo): TestStepInfo {
    var currentStepPassed = true;
    var currentStepWasCompleted = true;
    var actorIds = Object.keys(testSession.actors);
    var actor, actorTest, step;

    for (var actorIdIndex = 0; actorIdIndex < actorIds.length; ++actorIdIndex) {
        actor = testSession.actors[actorIds[actorIdIndex]];
        actorTest = actor.tests[testSession.currentTestIndex];

        if (actorTest && actorTest.steps) {
            step = actorTest.steps[testSession.currentStepIndex];

            if (!step) {
                currentStepWasCompleted = false;
                currentStepPassed = false;
                break;
            } else {
                if (step.status !== constants.stepStatus.COMPLETED) {
                    currentStepWasCompleted = false;
                    currentStepPassed = false;
                } else {
                    if (step.result !== constants.stepResult.PASSED) {
                        currentStepPassed = false;
                    }
                }
            }
        } else {
            currentStepWasCompleted = false;
        }
    }

    return {
        index: testSession.currentStepIndex,
        result: currentStepPassed ?
            constants.stepResult.PASSED :
            constants.stepResult.PENDING,
        status: currentStepWasCompleted ?
            constants.stepStatus.COMPLETED :
            constants.stepStatus.PENDING
    };
}

/** Resets the test status and all related fields. For all test actors,
 * resets the status and result of all the test steps for the specified
 * test to "pending" */
function resetTestStatus(testSession: TestSessionInfo, testIndex: number) {
    let test = testSession.tests[testIndex];

    test.actions = [];
    test.currentDataRecordIndex = 0;
    test.timeStarted = null;
    test.timeCompleted = null;
    test.sharedData = {};
    test.result = constants.testResult.PENDING;
    test.status = constants.testStatus.PENDING;

    // Reset test steps for actors for the current test index
    for (let actorId of Object.keys(testSession.actors)) {
        let actor: ActorSessionState = testSession.actors[actorId];
        actor.tests[testIndex].currentStepIndex = -1;
        actor.tests[testIndex].timeStarted = null;
        actor.tests[testIndex].timeCompleted = null;
        for (let step of actor.tests[testIndex].steps) {
            step.result = constants.stepResult.PENDING;
            step.status = constants.stepStatus.PENDING;
            step.timeStarted = null;
            step.timeCompleted = null;
        }
    }
}

export function startCleanupInterval() {
    let config = configLoader.getConfig();
    let cleanupSessionsInterval = (config.cleanupSessionsIntervalSec || 10) * 1000;
    cleanupIntervalId = setInterval(cleanupSessions, cleanupSessionsInterval);
}

export function stopCleanupInterval() {
    clearInterval(cleanupIntervalId);
}

/** Update the status for a test step using the supplied arguments and
 * making sure the update makes sense */
export function updateActorStepStatus(
    testSession: TestSessionInfo,
    actorId: any,
    testIndex: number,
    stepIndex: number,
    newStatus: string) {

    actorId = parseInt(actorId);
    let sessionActor: ActorSessionState = testSession.actors[actorId];
    var actorTest = sessionActor.tests[testIndex];

    if (!actorTest) {
        actorTest = sessionActor.tests[testIndex] = {
            currentStepIndex: -1,
            steps: [],
            name: testSession.tests[testIndex].name,
            path: testSession.tests[testIndex].path,
            timeCompleted: null,
            timeStarted: Date.now()
        };
    }

    var currentStep: TestStepInfo = actorTest.steps[actorTest.currentStepIndex];

    switch (newStatus) {
        case constants.stepStatus.STARTED:
            let now = Date.now();

            // Make sure we're not starting the same step twice
            if (stepIndex === actorTest.currentStepIndex) {
                throw new Error(util.format('Cannot start step %s because it was already started',
                    stepIndex));
            }

            // Make sure the current step is complete
            if (currentStep && (currentStep.status !== constants.stepStatus.COMPLETED)) {
                throw new Error(util.format('Cannot start step %s because the current step is not complete yet',
                    stepIndex));
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

            actorTest.currentStepIndex = stepIndex;

            actorTest.steps[actorTest.currentStepIndex] = {
                index: actorTest.currentStepIndex,
                status: constants.stepStatus.STARTED,
                timeStarted: Date.now(),
                timeCompleted: null,
                result: constants.stepResult.PENDING
            }

            if (!test.steps[actorTest.currentStepIndex].timeStarted) {
                test.steps[actorTest.currentStepIndex].timeStarted = now;
            }
            break;
        case constants.stepStatus.COMPLETED:
            // Make sure we're completing the current step and not something else
            if (stepIndex !== actorTest.currentStepIndex) {
                throw new Error(util.format('Cannot complete step %s because it is not the current step (step %s). Actor: %s. Test session: %s. Test index: %s',
                    stepIndex,
                    actorTest.currentStepIndex,
                    actorId,
                    testSession.id,
                    testIndex));
            }

            currentStep.status = constants.stepStatus.COMPLETED;
            currentStep.timeCompleted = Date.now();
            break;
        default:
            throw new Error(util.format('Unknown step status "%s". Valid status values are: %s',
                newStatus,
                Object.keys(constants.stepStatus)
                    .map((k) => { return '"' + constants.stepStatus[k] + '"'; })
                    .join(', ')));
    }
}

/** Updates the current test index and current step index for a session based
 * on the status reported by actors for the current test step */
export function updateSessionState(testSession: TestSessionInfo) {
    let self = this;

    const sessionInfo = computeCurrentTestStepInfo(testSession);

    // Check if the current step for the current test was completed on all actors
    var currentStepWasCompleted = (sessionInfo.status === constants.stepStatus.COMPLETED);
    var currentStepPassed = (sessionInfo.result === constants.stepResult.PASSED);

    var currentTestDef = testSession.tests[testSession.currentTestIndex];
    var lastStepIndex = Math.max.apply(null, currentTestDef.steps.map(function (s) {
        return s.index;
    }));

    // Check if the last step for the current test was completed and advance to the next test
    if (currentStepWasCompleted) {
        var currentTest = testSession.tests[testSession.currentTestIndex];
        var currentStep = currentTest.steps[testSession.currentStepIndex];

        currentStep.status = constants.stepStatus.COMPLETED;
        currentStep.result = currentStepPassed ? constants.stepResult.PASSED : constants.stepResult.FAILED;
        currentStep.timeCompleted = Date.now();

        let reachedLastStep = (testSession.currentStepIndex >= lastStepIndex);

        if (reachedLastStep || !currentStepPassed) {
            const now = Date.now();

            if (currentTest.isDataDriven) {
                currentTest.subtests = currentTest.subtests || [];
                currentTest.subtests[currentTest.currentDataRecordIndex] = {
                    actions: currentTest.actions,
                    currentDataRecordIndex: currentTest.currentDataRecordIndex,
                    currentIteration: currentTest.currentIteration,
                    result: currentStepPassed
                        ? constants.testResult.PASSED
                        : constants.testResult.FAILED,
                    status: constants.testStatus.COMPLETED,
                    steps: currentTest.steps,
                    timeStarted: currentTest.timeStarted,
                    timeCompleted: now
                };
            }

            const reachedLastDataRecord =
                !currentTest.isDataDriven ||
                currentTest.currentDataRecordIndex >= currentTest.dataRecordCount - 1;

            if (reachedLastDataRecord) {
                currentTest.status = constants.testStatus.COMPLETED;
                currentTest.result = currentStepPassed ? constants.testResult.PASSED : constants.testResult.FAILED;
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
                testSession.currentDataRecordIndex = 0;
            } else {
                // Increase data record index for the current test
                // and reset the test status
                let nextDataRecordIndex
                    = currentTest.currentDataRecordIndex + 1;

                resetTestStatus(testSession, testSession.currentTestIndex);
                currentTest.currentDataRecordIndex = nextDataRecordIndex;
                testSession.currentDataRecordIndex = nextDataRecordIndex;
            }

            testSession.currentStepIndex = 0;

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
                    sessionHelper.completeSession(testSession.id, constants.testSessionResult.PASSED);
                } else {
                    if (testSession.currentIteration < testSession.maxIterations) {
                        incrementIteration(testSession);
                    } else {
                        sessionHelper.completeSession(testSession.id, constants.testSessionResult.FAILED);
                    }
                }
            }
        } else {
            ++testSession.currentStepIndex;
        }
    }
}

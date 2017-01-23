import * as constants from './constants';
import {
    ActorSessionState,
    ActorSessionTestState,
    StepUpdateInfo,
    TestActor,
    TestSessionInfo,
    TestStepInfo
} from './dbTypes';
import * as sessionsCleanup from '../lib/session-cleanup';
import * as util from 'util';

/** Increments the session iteration number an resets session state to
 * prepare for running the next iteration */
function incrementIteration(testSession: TestSessionInfo) {
    // Only continue if there's at least one failed test
    let firstFailedTestIndex = testSession.tests.findIndex((t) => t.result === constants.testResult.FAILED);
    if (firstFailedTestIndex === -1) { return; }

    // Reset data for failed tests, both for session and for the session actors
    for (let index = 0; index < testSession.tests.length; ++index) {
        let test = testSession.tests[index];

        if (test.result === constants.testResult.FAILED) {
            test.timeStarted = null;
            test.timeCompleted = null;
            test.sharedData = {};
            test.result = constants.testResult.PENDING;
            test.status = constants.testStatus.PENDING;
        }

        // Reset test steps for actors for the current test index
        for (let actorId of Object.keys(testSession.actors)) {
            let actor: ActorSessionState = testSession.actors[actorId];
            actor.tests[index].currentStepIndex = -1;
            actor.tests[index].timeStarted = null;
            actor.tests[index].timeCompleted = null;

            for (let step of actor.tests[index].steps) {
                step.result = constants.stepResult.PENDING;
                step.status = constants.stepStatus.PENDING;
                step.timeStarted = null;
                step.timeCompleted = null;
            }
        }
    }

    ++testSession.currentIteration;
    testSession.currentTestIndex = firstFailedTestIndex;
    testSession.currentStepIndex = 0;
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
                test.currentIteration = (test.currentIteration || 0) + 1;
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

    // Check if the current step for the current test was completed on all actors
    var currentStepWasCompleted = true;
    var currentStepPassed = true;

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
            currentTest.status = constants.testStatus.COMPLETED;
            currentTest.result = currentStepPassed ? constants.testResult.PASSED : constants.testResult.FAILED;
            currentTest.timeCompleted = Date.now();

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
            testSession.currentStepIndex = 0;

            let reachedLastTest = (testSession.currentTestIndex >= testSession.tests.length);

            if (reachedLastTest) {
                let allTestsPassed = testSession.tests.every(function (t) {
                    return t.result === constants.testResult.PASSED;
                });

                //TODO: 1/23 This section needs to be pulled out of this function. We don't want any DB updates in here.
                if (allTestsPassed) {
                    sessionsCleanup.completeSession(testSession.id, constants.testSessionResult.PASSED);
                } else {
                    if (testSession.iterations > testSession.currentIteration) {
                        incrementIteration(testSession);
                    } else {
                        sessionsCleanup.completeSession(testSession.id, constants.testSessionResult.FAILED);
                    }
                }
            }
        } else {
            ++testSession.currentStepIndex;
        }
    }
}
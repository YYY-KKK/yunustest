import * as configLoader from './configLoader';
import * as constants from './constants'
import { db, memDb } from './db';
import * as helpers from './helpers';
import * as logManager from '../lib/log-manager';

let intervalId;

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

export function start() {
    let config = configLoader.getConfig();
    let cleanupSessionsInterval = (config.cleanupSessionsIntervalSec || 10) * 1000;
    intervalId = setInterval(cleanupSessions, cleanupSessionsInterval);
}

export function stop() {
    clearInterval(intervalId);
}
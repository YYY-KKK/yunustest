import * as appRoot from 'app-root-path';
import * as _ from 'underscore';
import * as configLoader from '../lib/configLoader';
import * as constants from '../lib/constants';
import { db, memDb } from '../lib/db';
import { SessionTestActor } from '../lib/dbTypes';
import { NedbAdapter } from '../lib/nedbAdapter';
import * as fs from 'fs';
import * as express from 'express';
import * as helpers from '../lib/helpers';
import * as http from 'http';
import * as logManager from '../lib/log-manager';
import * as  moment from 'moment';
import * as path from 'path';
import * as sessionsCleanup from '../lib/session-cleanup';
import * as testRepo from '../lib/testRepo';
import * as util from 'util';

export let apiRouter = express.Router();

// Announce the availability of an actor
apiRouter.post('/actor/announce', async function (req, res) {
    let actorId = parseInt(req.body.actorId);
    let actorType = req.body.actorType;

    if (actorId && actorType) {
        let actor = await memDb.getActor(actorId);
        if (!actor) {
            await memDb.insertActor(actorId, actorType);
        }

        await memDb.updateActor(actorId, {
            ip: req.ip,
            lastSeenTime: Date.now()
        });

        actor = await memDb.getActor(actorId);
        res.json(actor);
    } else {
        res.status(400).end("The request is missing the actor ID or actor type");
    }
});

// Publish test actor catalog
apiRouter.post('/actor/:actorId/catalog', async function (req, res) {
    let actorId = parseInt(req.params.actorId);

    let actor = await memDb.getActor(actorId);
    if (actor) {
        let catalog = req.body;
        await memDb.updateActor(actorId, { catalog: catalog });

        if (catalog.tests && catalog.tests.length) {
            testRepo.setTestInfos(catalog.tests);
        }

        res.end();
    } else {
        res.status(400).end("Actor ID not found");
    }
});

// Get all actors
apiRouter.get('/actors', async function (req, res) {
    res.json(await memDb.getActorsByType());
});

/**
 * @api {get} /api/reset Reset the database
 * @apiName ResetDb
 * @apiGroup Miscellaneous
 */
apiRouter.get('/reset', async function (req, res) {
    try {
        await memDb.resetMemoryDb();
        db.resetPersistentDb();
        testRepo.parseTestRepo();
        res.send('Database was reset successfully');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

/**
 * @api {get} /api/reset Reload the test catalog
 * @apiName ReloadTestCatalog
 * @apiGroup Miscellaneous
 */
apiRouter.get('/reload-tests', function (req, res) {
    try {
        testRepo.parseTestRepo();
        res.send('Test catalog was reloaded successfully');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Create test session
apiRouter.post('/session', async function (req, res) {
    let testsInfo = (req.body && req.body.tests) || [];
    let rawActors = [];
    let sessionTests = [];
    let config = configLoader.getConfig();

    testsInfo.forEach(function (t) {
        rawActors = rawActors.concat(t.actors);
        let sessionTest = {
            path: t.path,
            name: t.name,
            currentStepIndex: 0,
            status: "pending",
            steps: []
        };

        let maxStepIndex = Math.max.apply(null, t.steps);

        for (let stepIndex = 0; stepIndex <= maxStepIndex; ++stepIndex) {
            sessionTest.steps.push({
                index: stepIndex
            });
        }

        sessionTests.push(sessionTest);
    });

    let requiredActors = _.union(rawActors).sort();
    let actorsInfo = requiredActors.map(function (a) {
        return { actorType: a, acquired: false };
    });

    let sessionId = Math.round(moment().valueOf() / 1000);
    let sessionIterations = (req.body && req.body.maxIterations) || 1;
    let sessionLabel = (req.body && req.body.sessionLabel) || sessionId.toString();

    // Find the first available session ID
    while (await memDb.getMemSession(sessionId) != null) {
        ++sessionId;
    }

    let acquireActorsTimeout = config.acquireActorsTimeoutSec * 1000;
    let startAcquireTimeout = 1000;

    let startAquireTime = Date.now();

    await memDb.insertMemSession(sessionId, sessionLabel);
    await memDb.updateMemSession(sessionId, { iterations: sessionIterations, tests: sessionTests });

    let startAcquireActorsTime = Date.now();
    let sessionActors = {};
    let log = logManager.getSessionLog(sessionId);
    log.info(helpers.format('Acquiring actors for session {0} ({1})',
        sessionId,
        requiredActors.join(', ')));
    await acquireActors();
    res.json({ sessionId }).end();

    async function acquireActors() {
        //TODO: Check that the test session is not cancelled. If it is, free all acquired actors and return.
        let session = await memDb.getMemSession(sessionId);

        if (!session || session.status === constants.testSessionStatus.COMPLETED) {
            return;
        }

        try {
            // Identify available actors to run this test session
            for (let a of actorsInfo) {
                if (!a.acquired) {
                    let testActor = _.find(await memDb.getActorsByType(a.actorType), function (actor) {
                        return !actor.testSessionId;
                    });

                    if (testActor) {
                        await memDb.updateActor(testActor.id, { testSessionId: sessionId });
                        let dbActor = await memDb.getActor(testActor.id);
                        if (dbActor.testSessionId === sessionId) {
                            let sessionActor: SessionTestActor = {
                                ...testActor,
                                tests: []
                            };
                            sessionActors[sessionActor.id] = sessionActor;
                            a.acquired = true;
                        }
                    }
                }
            }

            let allActorsAquired = actorsInfo.filter(function (a) { return !a.acquired; })[0] == undefined;
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
            sessionLabel,
            moment().utc().format('YYYY-MM-DD HH:mm:ss')));

        await memDb.updateMemSession(sessionId, {
            actors: sessionActors,
            status: constants.testSessionStatus.STARTED
        });
    }
});

// Get test session
apiRouter.get('/session/:sessionId', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);

    let testSession = await memDb.getMemSession(sessionId);
    if (!testSession) {
        res.status(404).send(helpers.format('Session {0} not found', sessionId));
    } else {
        res.json(testSession);
    }
});

// Cancel test session
apiRouter.delete('/session/:sessionId', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);

    let testSession = await memDb.getMemSession(sessionId);
    if (!testSession) {
        res.status(404).send(helpers.format('Session {0} not found', sessionId));
    } else {
        if (testSession.status === constants.testSessionStatus.COMPLETED) {
            res.end();
            return;
        }

        //TODO: 1/17 Use the sessions-cleanup's cancelSession() function
        try {
            // Free up test actors
            for (let actorId of Object.keys(testSession.actors)) {
                await memDb.updateActor(+actorId, { testSessionId: null });
            }

            // Cancel session
            await memDb.updateMemSession(sessionId, {
                status: constants.testSessionStatus.COMPLETED,
                result: constants.testSessionResult.CANCELLED
            });

            res.end();
        } catch (err) {
            res.status(500).send(err.message);
        }
    }
});

// Get session log
apiRouter.get('/session/:sessionId/log', function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    let download = helpers.parseBool(req.query.download || false);

    let logFilePath = path.join(appRoot.path, 'logs', sessionId + '.log');
    if (download) {
        res.header('Content-Type', 'text/plain');
        res.header(
            'Content-Disposition',
            util.format('attachment; filename="%s"',
                sessionId + '.log'));

        res.sendFile(logFilePath);
    } else {
        let logContents: string;
        fs.readFile(logFilePath, 'utf8', function (err, data) {
            if (err) {
                res.status(500).send(err.message);
            };

            res.send(data
                .replace(/\\r\\n/g, '<br>')
                .replace(/\\n/g, '<br>')
                .replace(/\n/g, '<br>')
                .replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'));
        });
    }
});

// Create log entry
apiRouter.post('/session/:sessionId/log', function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    let level = req.body.level || 'info';
    let message = req.body.message;
    let extras = req.body.extras || {};

    if (sessionId) {
        let log = logManager.getSessionLog(sessionId);
        switch (level) {
            case 'debug': log.debug(extras, message); break;
            case 'error': log.error(extras, message); break;
            case 'info': log.info(extras, message); break;
        }
        (log as any).flushStreams();
        console.log(message);
    } else {
        res.status(400).send("Session ID not found");
    }

    res.end();
});

// Get session status
apiRouter.get('/session/:sessionId/status', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);

    var testSession = await memDb.getMemSession(sessionId);
    if (!testSession) {
        res.status(404).send(helpers.format('Session {0} not found', sessionId));
        return;
    }

    if (testSession.status === constants.testSessionStatus.STARTED) {
        res.json({
            currentIteration: testSession.currentIteration,
            currentTestIndex: testSession.currentTestIndex,
            currentTestPath: testSession.tests[testSession.currentTestIndex].path,
            currentTestName: testSession.tests[testSession.currentTestIndex].name,
            currentStepIndex: testSession.currentStepIndex,
            result: testSession.result,
            status: testSession.status
        });
    } else {
        res.json({
            result: testSession.result,
            status: testSession.status
        });
    }
});

// Update a test step
apiRouter.put('/session/:sessionId/actor/:actorId/test/:testIndex/step/:stepIndex', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    let actorId = parseInt(req.params.actorId);
    let testIndex = req.params.testIndex;
    let stepIndex = req.params.stepIndex;

    try {
        stepIndex = parseInt(stepIndex);
        await memDb.updateActorStep(sessionId, actorId, testIndex, stepIndex, req.body);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// Report a critical error that occured in one of the actors, which means
// the test session needs to be terminated
apiRouter.put('/session/:sessionId/actor/:actorId/critical-error', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    let actorId = parseInt(req.params.actorId);
    let errorInfo = req.body;

    let log = logManager.getSessionLog(sessionId);
    log.error(helpers.format(
        'Actor {0} reported a critical error while executing session {1}. Error info: {2}',
        actorId,
        sessionId,
        errorInfo));
    await sessionsCleanup.cancelSession(sessionId);
    res.end();
});

// Get test shared data
apiRouter.get('/session/:sessionId/test/:testIndex/data', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    var testIndex = req.params.testIndex;

    var testSession = await memDb.getMemSession(sessionId);
    if (testSession) {
        var test = testSession.tests[testIndex];
        if (!test) {
            res.status(404).end(util.format('Test index %s doesn\'t exist in session %s',
                testIndex,
                sessionId));
        }

        res.send(test.sharedData || {});
    } else {
        res.status(404).end(util.format('Test session %s not found', sessionId));
    }
});

// Update test shared data
apiRouter.put('/session/:sessionId/test/:testIndex/data', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    var testIndex = req.params.testIndex;
    // TODO Check that body is valid JSON
    var newData = req.body;

    var testSession = await memDb.getMemSession(sessionId);
    if (testSession) {
        let sessionTests = testSession.tests;
        var test = sessionTests[testIndex];
        if (!test) {
            res.status(404).send(util.format('Test index %s was not found', testIndex));
        }

        test.sharedData = test.sharedData || {};
        Object.assign(test.sharedData, newData);
        await memDb.updateMemSession(sessionId, { tests: sessionTests });
        res.end();
    } else {
        res.status(404).send(util.format('Test session %s not found', sessionId));
    }
});

// Get all sessions
apiRouter.get('/sessions', async function (req, res) {
    var dbSessions = await memDb.getMemSessions().then(function (dbSessions) {
        // Clone all sessions
        var sessions = dbSessions.map(function (dbSession) {
            var session = helpers.clone(dbSession);
            return session;
        });

        // Sort by session creation date
        sessions = _.sortBy(sessions, 'timeCreated');

        res.json(sessions);
    });
});

// Get the contents of a test asset file
apiRouter.get('/test-asset', function (req: express.Request, res: express.Response) {
    let config = configLoader.getConfig();
    var assetType: 'data' | 'macro' | 'test' = req.query.type;
    var partialPath: string = req.query.path;

    try {
        var fullPath: string;
        switch (assetType) {
            case 'data':
                fullPath = path.join(config.testRepoDir, 'data', partialPath + '.yaml');
                break;
            case 'macro':
                // First look for the /macros directory
                fullPath = path.join(config.testRepoDir, 'macros', partialPath + '.yaml');
                if (helpers.fileExists(fullPath)) { break; }

                // Then look for the /libs/macros directory
                fullPath = path.join(config.testRepoDir, 'libs', 'macros', partialPath + '.yaml');
                break;
            case 'test':
                fullPath = path.join(config.testRepoDir, 'tests', partialPath + '.yaml');
                break;
            default:
                res.status(404).send(helpers.format('Asset type {0} is unknown', assetType));
                return;
        }

        if (helpers.fileExists(fullPath)) {
            res.sendFile(path.resolve(fullPath));
        } else {
            res.status(404).send(helpers.format(
                'File not found: {0}',
                fullPath));
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Get test catalog
apiRouter.get('/tests', function (req, res) {
    res.setHeader("Cache-Control", "no-cache");
    res.json(testRepo.testInfos);
});
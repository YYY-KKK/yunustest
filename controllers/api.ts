import * as _ from 'underscore';
var appRoot = require('app-root-path').path;
import * as config from '../config';
import * as constants from '../lib/constants';
import * as db from '../lib/db';
import * as fs from 'fs';
import * as express from 'express';
import * as helpers from '../lib/helpers';
import * as http from 'http';
var logManager = require('../lib/log-manager');
var moment = require('moment');
import * as path from 'path';
var router = express.Router();
import * as testRepo from '../lib/testRepo';
var util = require('util');

// Announce the availability of an actor
router.post('/actor/announce', function (req, res) {
    var actorId = req.body.actorId;
    var actorType = req.body.actorType;

    if (actorId && actorType) {
        var actor = db.getActorSync(actorId);
        if (!actor) {
            db.insertActorSync(actorId, actorType);
        }

        db.updateActorSync(actorId, {
            ip: req.ip,
            lastSeenTime: Date.now()
        });

        actor = db.getActorSync(actorId);
        res.json(actor);
    } else {
        res.status(400).end("Missing actor ID or actor type");
    }
});

// Publish test actor catalog
router.post('/actor/:actorId/catalog', function (req, res) {
    var actorId = req.params.actorId;

    var actor = db.getActorSync(actorId);
    if (actor) {
        var catalog = req.body;
        db.updateActorSync(actorId, { catalog: catalog });

        if (catalog.tests && catalog.tests.length) {
            testRepo.setTestInfos(catalog.tests);
        }

        res.end();
    } else {
        res.status(400).end("Actor ID not found");
    }
});

// Get all actors
router.get('/actors', function (req, res) {
    res.json(db.findActorsByTypeSync());
});

/**
 * @api {get} /api/reset Reset the database
 * @apiName ResetDb
 * @apiGroup Miscellaneous
 */
router.get('/reset', function (req, res) {
    try {
        db.resetDb();
        testRepo.parseTestRepo();
        res.send('Database was reset successfully');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Create test session
router.post('/session', function (req, res) {
    var testsInfo = req.body && req.body.tests;
    var rawActors = [];
    var sessionTests = [];

    testsInfo.forEach(function (t) {
        rawActors = rawActors.concat(t.actors);
        var sessionTest = {
            path: t.path,
            name: t.name,
            currentStepIndex: 0,
            status: "pending",
            steps: []
        };

        var maxStepIndex = Math.max.apply(null, t.steps);

        for (var stepIndex = 0; stepIndex <= maxStepIndex; ++stepIndex) {
            sessionTest.steps.push({
                index: stepIndex
            });
        }

        sessionTests.push(sessionTest);
    });
    var actorsInfo = _.union(rawActors).map(function (a) {
        return { actorType: a, acquired: false };
    });

    var sessionId = moment().format('HHmmssSSS');
    var gmaActor, np6Actor;
    var acquireTimeout = 2000;

    var startAquireTime = Date.now();
    var maxAquireWaitTime = 20 * 60 * 1000; // 20 minutes

    db.insertSessionSync(sessionId);
    db.updateSessionSync(sessionId, { tests: sessionTests });

    var startAcquireActorsTime = Date.now();
    var sessionActors = {};
    acquireActors();
    res.end();

    function acquireActors() {
        //TODO: Check that the test session is not cancelled. If it is, free all acquired actors and return.

        // Check the maximum time interval for acquiring actors was not exceeded
        if (Date.now() - startAquireTime > maxAquireWaitTime) {
            return;
        }

        try {
            // Identify available actors to run this test session
            actorsInfo.forEach(function (a) {
                if (!a.acquired) {
                    var sessionActor = _.find(db.findActorsByTypeSync(a.actorType), function (actor) {
                        return !actor.testSessionId;
                    });

                    if (sessionActor) {
                        db.updateActorSync(sessionActor.id, { testSessionId: sessionId });

                        sessionActor = helpers.clone(sessionActor);
                        sessionActor.tests = [];
                        sessionActors[sessionActor.id] = sessionActor;
                        a.acquired = true;
                    }
                }
            });
        } catch (err) {
            //TODO: Log error
        }

        var allActorsAquired = actorsInfo.filter(function (a) { return !a.acquired; })[0] == undefined;
        if (allActorsAquired) {
            startTestSession();
        } else {
            if (Date.now() - startAcquireActorsTime < 6 * 60 * 1000) {
                setTimeout(acquireActors, acquireTimeout);
            } else {
                var testSession = db.getSessionSync(sessionId);

                if (testSession) {
                    testSession.status = constants.testSessionStatus.COMPLETED;
                    testSession.timeCompleted = Date.now();
                    testSession.result = constants.testSessionResult.CANCELLED;
                }
            }
        }
    }

    function startTestSession() {
        db.updateSessionSync(sessionId, {
            actors: sessionActors,
            status: constants.testSessionStatus.STARTED
        });
    }
});

// Get test session
router.get('/session/:sessionId', function (req, res) {
    var sessionId = req.params.sessionId;

    var testSession = db.getSessionSync(sessionId);
    if (!testSession) {
        res.status(404).send("Session not found");
    } else {
        res.json(testSession);
    }
});

// Get session log
router.get('/session/:sessionId/log', function (req, res) {
    var sessionId = req.params.sessionId;
    var download = helpers.parseBool(req.query.download || false);

    var logFilePath = path.join(appRoot, 'logs', sessionId + '.log');
    if (download) {
        res.header('Content-Type', 'text/plain');
        res.header(
            'Content-Disposition',
            util.format('attachment; filename="%s"',
                sessionId + '.log'));

        res.sendFile(logFilePath);
    } else {
        var logContents: string;
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
router.post('/session/:sessionId/log', function (req, res) {
    var sessionId = req.params.sessionId;
    var level = req.body.level || 'info';
    var message = req.body.message;
    var extras = req.body.extras || {};

    if (sessionId !== 'null') {
        var log = logManager.getSessionLog(sessionId);
        switch (level) {
            case 'debug': log.debug(extras, message); break;
            case 'error': log.error(extras, message); break;
            case 'info': log.info(extras, message); break;
        }
        log.flushStreams();
        console.log(message);
    } else {
        res.status(400).send("Session ID not found");
    }

    res.end();
});

// Get session status
router.get('/session/:sessionId/status', function (req, res) {
    var sessionId = req.params.sessionId;

    var testSession = db.getSessionSync(sessionId);
    if (!testSession) {
        res.status(404).end(http.STATUS_CODES[404]);
        return;
    }

    if (testSession.status === constants.testSessionStatus.STARTED) {
        res.json({
            currentTestIndex: testSession.currentTestIndex,
            currentTestPath: testSession.tests[testSession.currentTestIndex].path,
            currentTestName: testSession.tests[testSession.currentTestIndex].name,
            currentStepIndex: testSession.currentStepIndex,
            status: testSession.status
        });
    } else {
        res.json({
            status: testSession.status
        });
    }
});

// Update a test step
router.put('/session/:sessionId/actor/:actorId/test/:testIndex/step/:stepIndex', function (req, res) {
    var sessionId = req.params.sessionId;
    var actorId = req.params.actorId;
    var testIndex = req.params.testIndex;
    var stepIndex = req.params.stepIndex;

    try {
        stepIndex = parseInt(stepIndex);
        db.updateActorStepSync(sessionId, actorId, testIndex, stepIndex, req.body);
        res.end();
    } catch (err) {
        res.status(500).end(err.message);
    }

    res.end();
});

// Get test shared data
router.get('/session/:sessionId/test/:testIndex/data', function (req, res) {
    var sessionId = req.params.sessionId;
    var testIndex = req.params.testIndex;

    var testSession = db.getSessionSync(sessionId);
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
router.put('/session/:sessionId/test/:testIndex/data', function (req, res) {
    var sessionId = req.params.sessionId;
    var testIndex = req.params.testIndex;
    // TODO Check that body is valid JSON
    var newData = req.body;

    var testSession = db.getSessionSync(sessionId);
    if (testSession) {
        var test = testSession.tests[testIndex];
        if (!test) {
            test = testSession.tests[testIndex] = {};
        }

        if (!test.sharedData) {
            test.sharedData = {};
        }

        Object.keys(newData).forEach(function (key) {
            test.sharedData[key] = newData[key];
        });
        res.end();
    } else {
        res.status(404).end(util.format('Test session %s not found', sessionId));
    }
});

// Get all sessions
router.get('/sessions', function (req, res) {
    var dbSessions = db.getSessionsSync();

    // Clone all sessions
    var sessions = dbSessions.map(function (dbSession) {
        var session = helpers.clone(dbSession);
        return session;
    });

    // Sort by session creation date
    sessions = _.sortBy(sessions, 'timeCreated');

    res.json(sessions);
});

// Get the contents of a test asset file
router.get('/test-asset', function (req: express.Request, res: express.Response) {
    var assetType: 'data' | 'macro' | 'test' = req.query.type;
    var partialPath: string = req.query.path;

    try {
        var fullPath: string;
        switch (assetType) {
            case 'data':
                fullPath = path.join(config.testRepoLocation, 'test-defs', 'data', partialPath + '.yaml');
                break;
            case 'macro':
                fullPath = path.join(config.testRepoLocation, 'test-defs', 'libs', 'macros', partialPath + '.yaml');
                break;
            case 'test':
                fullPath = path.join(config.testRepoLocation, 'test-defs', 'tests', partialPath + '.yaml');
                break;
            default:
                res.status(404).send(helpers.format('Asset type {0} is unknown', assetType));
                return;
        }

        if (helpers.fileExists(fullPath)) {
            res.sendFile(path.resolve(fullPath));
        } else {
            res.status(404).send(helpers.format(
                'The file for {0} {1} was not found',
                assetType,
                partialPath));
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Get test catalog
router.get('/tests', function (req, res) {
    res.setHeader("Cache-Control", "no-cache");
    res.json(testRepo.testInfos);
});

module.exports = router;
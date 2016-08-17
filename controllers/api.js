var rek = require('rekuire');
var _ = require('underscore'); 
var appRoot = require('app-root-path').path;
var constants = rek('lib/constants');
var db = rek('lib/db');
var express = require('express');
var helpers = rek('lib/helpers');
var http = require('http');
var logManager = rek('lib/log-manager');
var moment = require('moment'); 
var path = require('path'); 
var router = express.Router();
var util = require('util'); 

// Announce the availability of an actor
router.post('/actor/announce', function(req, res) {
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

// Get all actors
router.get('/actors', function(req, res) {
    res.json(db.findActorsByTypeSync());
});

/**
 * @api {get} /api/reset Reset the database
 * @apiName ResetDb
 * @apiGroup Miscellaneous
 */
router.get('/reset', function(req, res) {
    try {
        db.reset();
        res.send('Database was reset successfully');
    } catch(e) {
        res.status(500).send(e.message);
    }
});

// Create test session
router.post('/session', function(req, res) {
    var sessionId = moment().format('HHmmssSSS');
    var gmaActor, np6Actor;
    var acquireTimeout = 2000;

    var startAquireTime = Date.now();
    var maxAquireWaitTime = 20 * 60 * 1000; // 20 minutes

    db.insertSessionSync(sessionId);
    
    //TODO Replace the hard-coded list of tests
    db.updateSessionSync(sessionId, {
        tests: [
            {
                path: "demo",
                name: "TC0001_CreateAccount",
                currentStepIndex: 0,
                status: "pending",
                steps: [
                    {
                        index: 0,
                    }, {
                        index: 1,
                    }, {
                        index: 2,
                    }, {
                        index: 3,
                    }, {
                        index: 4,
                    }
                ]
            }
            ,
            {
                path: "demo",
                name: "TC0002_DeleteAccount",
                currentStepIndex: 0,
                status: "pending",
                steps: [
                    {
                        index: 0,
                    }, {
                        index: 1,
                    }, {
                        index: 2,
                    }, {
                        index: 3,
                    }, {
                        index: 4,
                    }
                ]
            }
            ,
            {
                path: "demo",
                name: "TC0003_RedeemOffer",
                currentStepIndex: 0,
                status: "pending",
                steps: [
                    {
                        index: 0,
                    }, {
                        index: 1,
                    }, {
                        index: 2,
                    }, {
                        index: 3,
                    }, {
                        index: 4,
                    }
                ]
            }
        ]
    });

    var startAcquireActorsTime = Date.now();
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
            if (!gmaActor) {
                gmaActor = db.findActorsByTypeSync('GMA').find(function(actor) {
                    return !actor.testSessionId;
                });

                if (gmaActor) {
                    db.updateActorSync(gmaActor.id, { testSessionId: sessionId });
                }
            }

            if (!np6Actor) {
                np6Actor = db.findActorsByTypeSync('NP6').find(function(actor) {
                    return !actor.testSessionId;
                });

                if (np6Actor) {
                    db.updateActorSync(np6Actor.id, { testSessionId: sessionId });
                }
            }
        } catch (err) {
            //TODO: Log error
        }

        var testSession = db.getSessionSync(sessionId);
        if (gmaActor && np6Actor) {
            startTestSession();
        } else {
            if (Date.now() - startAcquireActorsTime < 6 * 60 * 1000) {
                setTimeout(acquireActors, acquireTimeout);
            } else {
                if (testSession) {
                    testSession.status = constants.testSessionStatus.COMPLETED;
                    testSession.timeCompleted = Date.now();
                    testSession.result = constants.testSessionResult.CANCELLED;
                }
            }
        }
    }

    function startTestSession() {
        var actors = {}
        actors[gmaActor.id] = helpers.clone(gmaActor);
        actors[gmaActor.id].tests = [];
        actors[np6Actor.id] = helpers.clone(np6Actor);
        actors[np6Actor.id].tests = []; 

        db.updateSessionSync(sessionId, {
            actors: actors,
            status: constants.testSessionStatus.STARTED
        });
    }
});

// Get test session
router.get('/session/:sessionId', function(req, res) {
    var sessionId = req.params.sessionId;

    var testSession = db.getSessionSync(sessionId);
    if (!testSession) {
        res.status(404).send("Session not found");
    } else {
        res.json(testSession);
    }
});

// Get session log
router.get('/session/:sessionId/log', function(req, res) {
    var sessionId = req.params.sessionId;

    res.header('Content-Type', 'text/plain');
    res.header(
        'Content-Disposition',
        util.format('attachment; filename="%s"',
            sessionId + '.log'));
    var logFilePath = path.join(appRoot, 'logs', sessionId + '.log');
    res.sendFile(logFilePath);
});

// Create log entry
router.post('/session/:sessionId/log', function(req, res) {
    var sessionId = req.params.sessionId;
    var level = req.body.level || 'info';
    var message = req.body.message;
    var extras = req.body.extras || {};

    if (sessionId !== 'null') {
        var log = logManager.getSessionLog(sessionId);
        switch(level) {
            case 'debug': log.debug(extras, message); break;
            case 'error': log.error(extras, message); break;
            case 'info': log.info(extras, message); break;
        }
        log.flushStreams();
    } else {
        res.status(400).end("Missing session ID");
    }

    res.end();
});

// Get session status
router.get('/session/:sessionId/status', function(req, res) {
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

// Get test
router.get('/session/:sessionId/test/:testName', function(req, res) {
    var sessionId = req.params.sessionId;
    var testName = req.params.testName;

    var test = db.getTestSync(sessionId, testName);
    if (test) {
        res.json(test);
    } else {
        res.status(404).end(http.STATUS_CODES[404]);
    }
});

// Get step status
router.get('/session/:sessionId/test/:testIndex/step/:stepIndex/status', function(req, res) {
    var sessionId = req.params.sessionId;
    var testName = req.params.testName;
    var stepIndex = req.params.stepIndex;
    
    try {
        res.json(
            db.getStepStatusSync(sessionId, testName, stepIndex));
    } catch (err) {
        res.status(500).end(err.message);
    }
    
    res.end();
});

// Update a test step
router.put('/session/:sessionId/actor/:actorId/test/:testIndex/step/:stepIndex', function(req, res) {
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
router.get('/session/:sessionId/test/:testIndex/data', function(req, res) {
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
router.put('/session/:sessionId/test/:testIndex/data', function(req, res) {
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

        Object.keys(newData).forEach(function(key) {
            test.sharedData[key] = newData[key];
        });
        res.end();
    } else {
        res.status(404).end(util.format('Test session %s not found', sessionId));
    }
});

// Get all tests for specific session
router.get('/session/:sessionId/tests', function(req, res) {
    var sessionId = req.params.sessionId;
    
    res.json(db.getTestsForSessionSync(sessionId));
});

// Get all sessions
router.get('/sessions', function(req, res) {
    var dbSessions = db.getSessionsSync();

    // Clone all sessions
    var sessions = dbSessions.map(function(dbSession) {
        var session = helpers.clone(dbSession);
        return session;
    });

    // Sort by session creation date
    sessions = _.sortBy(sessions, 'timeCreated');

    res.json(sessions);
});

// Get all tests
router.get('/tests', function(req, res) {
    res.json(db.getTestsSync());
});

module.exports = router;
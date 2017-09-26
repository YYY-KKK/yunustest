import * as appRoot from 'app-root-path';
import * as configLoader from '../lib/configLoader';
import * as constants from '../lib/constants';
import { db, memDb } from '../lib/db';
import { SessionTestActor, TestAssetName, TestSessionInfo, TestSessionProperties } from '../lib/types';
import { NedbAdapter } from '../lib/nedbAdapter';
import * as fs from 'fs';
import * as express from 'express';
import * as helpers from '../lib/helpers';
import * as http from 'http';
import * as jsYaml from 'js-yaml';
import * as logManager from '../lib/log-manager';
import * as path from 'path';
import * as sessionHelper from '../lib/session-helper';
import * as thenify from 'thenify';
import * as testRepo from '../lib/testRepo';
import * as util from 'util';

export let apiRouter = express.Router();

// Announce the availability of an actor
apiRouter.post('/actor/announce', async function (req, res) {
    let actorId = parseInt(req.body.actorId);
    let actorType = req.body.actorType;
    let actorTags = req.body.actorTags || [];

    if (actorId && actorType) {
        let actor = await memDb.getActor(actorId);
        if (!actor) {
            await memDb.insertActor(actorId, actorType);
        }

        await memDb.updateActor(actorId, {
            ip: req.ip,
            tags: actorTags,
            lastSeenTime: Date.now()
        });

        actor = await memDb.getActor(actorId);
        res.json(actor);
    } else {
        res.status(400).end("The request is missing the actor ID or actor type");
    }
});

// Get all actors
apiRouter.get('/actors', async function (req, res) {
    res.json(await memDb.getActorsByType());
});

// Reset the database
apiRouter.get('/reset', async function (req, res) {
    try {
        await memDb.resetMemoryDb();
        await db.resetPersistentDb();
        res.send(
            `Database was reset successfully.<br><br>
            <a href="/" style="border:1px solid gray; padding: 10; border-radius: 5px; display: inline-block; text-decoration: none; color: black;">
                Go back home
            </a>`);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Parse the test repo and reload the tests
apiRouter.get('/reload-tests', function (req, res) {
    try {
        testRepo.parseTestRepo();
        res.send('Test catalog was reloaded successfully');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Create test session based on a session template file
apiRouter.post('/session/from-template', async function (req, res) {
    if (!req.body) {
        res.status(400).send("The request had no payload");
        return;
    }

    const templateAsset: TestAssetName = req.body.template;
    templateAsset.path = templateAsset.path || "/";
    if (!templateAsset || !templateAsset.name.trim()) {
        res.status(400).send("Template name is missing from the request payload");
        return;
    }

    const config = configLoader.getConfig();
    const testRepoDirFullPath = path.resolve(config.testRepoDir);
    const templatesDir = path.join(testRepoDirFullPath, 'templates');

    const templateFileFullPath = path.join(templatesDir, templateAsset.path, templateAsset.name + '.yaml');
    if (!helpers.fileExists(templateFileFullPath)) {
        res.status(404)
            .send(helpers.format(
                'Template file "{0}" was not found.',
                templateFileFullPath))
            .end();
        return;
    }
    const templateData = await thenify(fs.readFile)(templateFileFullPath, 'utf8');
    const template: TestSessionProperties = jsYaml.safeLoad(templateData);

    try {
        const sessionId = await sessionHelper.createSession(template);
        res.status(201).json({ sessionId }).end();
    } catch (err) {
        res.status(500).send((err && err.message) || 'Unknown error').end();
    }
});

// Create test session
apiRouter.post('/session', async function (req, res) {
    if (!req.body) {
        res.status(400).send('The request did not contain any payload');
        return;
    }

    if (!req.body.tests || !req.body.tests.length) {
        res.status(400).send('The request payload did not specify any tests to run');
        return;
    }

    const tags = req.body.actorTags ?
        String(req.body.actorTags)
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0) :
        [];


    let template: TestSessionProperties = {
        actorTags: tags,
        maxIterations: parseInt(req.body.maxIterations) || 1,
        sessionLabel: req.body.sessionLabel,
        tests: req.body.tests
    };

    sessionHelper.createSession(template)
        .then((sessionId) => {
            res.status(201).json({ sessionId }).end();
        })
        .catch((err) => {
            res.status(500).json(err).end();
        });
});

// Get test session details
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
        const currentTest = testSession.tests[testSession.currentTestIndex];

        res.json({
            currentDataRecordIndex: currentTest.currentDataRecordIndex,
            currentIteration: testSession.currentIteration,
            currentTestIndex: testSession.currentTestIndex,
            currentTestPath: currentTest.path,
            currentTestName: currentTest.name,
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
    const sessionId = parseInt(req.params.sessionId);
    const actorId = parseInt(req.params.actorId);
    const testIndex = req.params.testIndex;
    const stepIndexVal = req.params.stepIndex;

    try {
        const stepIndex = parseInt(stepIndexVal);
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
    await sessionHelper.cancelSession(sessionId);
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

// Get all test sessions
apiRouter.get('/sessions', async function (req, res) {
    var dbSessions = await memDb.getMemSessions({ limit: 100 }).then(function (dbSessions) {
        return res.json(dbSessions);
    });
});

// Get the contents of a test asset file
apiRouter.get('/test-asset', async function (req: express.Request, res: express.Response) {
    let config = configLoader.getConfig();
    var assetType: 'custom' | 'data' | 'image' | 'macro' | 'script' | 'test' = req.query.type;
    var partialPath: string = req.query.path;

    try {
        var fullPath: string;
        switch (assetType) {
            case 'custom':
                fullPath = path.join(config.testRepoDir, 'custom', partialPath);
                break;
            case 'data':
                let fullPathYaml = helpers.addExtension(path.join(config.testRepoDir, 'data', partialPath), 'yaml');
                if (helpers.fileExists(fullPathYaml)) {
                    fullPath = fullPathYaml;
                } else {
                    // YAML data file not found, so we also try our luck with the "csv" extension
                    let fullPathCsv = helpers.addExtension(path.join(config.testRepoDir, 'data', partialPath), 'csv');
                    if (helpers.fileExists(fullPathCsv)) {
                        fullPath = fullPathCsv;
                    }
                }
                break;
            case 'image':
                fullPath = path.join(config.testRepoDir, 'images', partialPath);
                break;
            case 'macro':
                // First look for the /macros directory
                fullPath = path.join(config.testRepoDir, 'macros', partialPath + '.yaml');
                if (helpers.fileExists(fullPath)) { break; }

                // Then look for the /libs/macros directory
                fullPath = path.join(config.testRepoDir, 'libs', 'macros', partialPath + '.yaml');
                break;
            case 'script':
                fullPath = path.join(config.testRepoDir, 'scripts', partialPath);
                break;
            case 'test':
                fullPath = path.join(config.testRepoDir, 'tests', partialPath + '.yaml');
                break;
            default:
                res.status(404).send(helpers.format('Asset type {0} is not supported. Please make sure the asset type parameter is valid and that you are not using an outdated version of the sync service.', assetType));
                return;
        }

        if (helpers.fileExists(fullPath)) {
            if (assetType === 'data' && helpers.endsWith(fullPath, 'csv')) {
                // Parse the CSV file and convert the data to YAML to allow
                // the test actor to process it in a consistent manner
                let csvRecords = await helpers.parseCsvFile(fullPath);
                let yamlData = jsYaml.safeDump(csvRecords);
                res.send(yamlData);
            } else {
                res.sendFile(path.resolve(fullPath));
            }
        } else {
            res.status(404).send(helpers.format(
                'File not found: {0}',
                partialPath));
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Get test catalog
apiRouter.get('/tests', function (req, res) {
    res.setHeader("Cache-Control", "no-cache");
    res.json(testRepo.allTestInfos);
});
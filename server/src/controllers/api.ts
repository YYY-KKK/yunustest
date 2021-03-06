import * as buildInfo from '../lib/build-info';
import * as configLoader from '../lib/config-loader';
import * as constants from '../lib/constants';
import * as dbManager from '../lib/db-manager';
import * as dirs from '../lib/dirs';
import * as AsyncLock from 'async-lock';
import {
    SubtestContext,
    TestAssetName,
    TestSessionProperties,
    TestSessionTemplate,
    TestContext
} from '../lib/types';
import * as fileWalker from '../lib/file-walker';
import * as fs from 'fs';
import * as express from 'express';
import * as helpers from '../lib/helpers';
import * as jsYaml from 'js-yaml';
import * as logManager from '../lib/log-manager';
import * as moment from 'moment';
import * as multer from 'multer';
import * as notifier from '../lib/websocket-notifier';
import * as path from 'path';
import * as readline from 'readline';
import * as sessionHelper from '../lib/session-helper';
import * as thenify from 'thenify';
import * as testRepo from '../lib/test-repo';
import * as util from 'util';
import * as xml from 'xmlbuilder';

export function createRouter(options?: any) {
    options = options || {};
    const isReadOnlyRouter = options.readOnly || false;

    let apiRouter: express.Router = express.Router();

    /** An object used for synchronization, to prevent multiple
     * actors updating a test segment simultaneously. */
    const updateTestSegmentLockKey = "updateTestSegmentLockKey";
    const lock = new AsyncLock();

    // Announce the availability of an actor
    apiRouter.post('/actor/announce', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        const db = dbManager.getDb();
        let actorId = parseInt(req.body.actorId);
        let actorType = req.body.actorType;
        let actorTags = req.body.actorTags || [];

        if (actorId && actorType) {
            let isNewActor = false;
            let actor = await db.getActor(actorId);
            if (!actor) {
                await db.insertActor(actorId, actorType);
                isNewActor = true;
            }

            await db.updateActor(actorId, {
                ip: req.ip,
                tags: actorTags,
                lastSeenTime: Date.now()
            });

            actor = await db.getActor(actorId);
            res.json(actor);

            if (isNewActor) {
                notifier.onActorsChanged(actorId);
            }
        } else {
            res.status(400).end("The request is missing the actor ID or actor type");
        }
    });

    // Get all actors
    apiRouter.get('/actors', async function (req, res) {
        const db = dbManager.getDb();
        res.json(await db.getActorsByTypeAndTags());
    });

    // Get build info (version, commit hash, etc.)
    apiRouter.get('/build-info', async function (req, res) {
        const buildInfoObj = buildInfo.getBuildInfo();
        res.json({
            buildDate: buildInfoObj.buildDate,
            commitSha: buildInfoObj.commitSha,
            version: buildInfoObj.version
        });
    });

    // Get list of environments
    apiRouter.get('/environments', async function (req, res) {
        const config = configLoader.getConfig();

        const environmentsDir = path.join(config.testRepoDir, 'data-env');
        if (helpers.directoryExists(environmentsDir)) {
            try {
                fs.readdir(environmentsDir, (err, files) => {
                    const environments = [];

                    files.forEach(file => {
                        environments.push(file);
                    });

                    res.json(environments);
                })
            } catch (err) {
                res.status(500).send(err.message);
            }
        } else {
            res.json([]);
        }
    });

    // Get the list of files and directories in the test repo
    apiRouter.get('/repo', async function (req, res) {
        try {
            const config = configLoader.getConfig();
            const testRepoDir = path.normalize(config.testRepoDir);

            const pathParam = req.query.path;
            if (pathParam) {
                const fileFullPath = path.normalize(path.join(testRepoDir, pathParam));

                if (!path.dirname(fileFullPath).startsWith(testRepoDir)) {
                    return res.status(401).send('Not authorized!');
                }

                if (helpers.fileExists(fileFullPath)) {
                    const extension = path.extname(pathParam).toLowerCase();
                    const textExtensions = ['.yaml', '.yml', '.csv'];
                    if (textExtensions.indexOf(extension) >= 0) {
                        return res.sendFile(fileFullPath, {
                            headers: {
                                'Content-Type': 'text/plain'
                            }
                        });
                    } else {
                        return res.sendFile(fileFullPath);
                    }
                } else {
                    return res.status(404).send(`Test asset "${pathParam}" not found!`);
                }
            }

            interface IFileInfo {
                path: string,
                name: string,
                isDir: boolean,
                size: number
            }
            const files: IFileInfo[] = [];

            await fileWalker.walkRecursive(
                testRepoDir,
                function (parentDirName: string, fileName: string, fileStats: fs.Stats) {
                    let path;
                    if (parentDirName.length <= testRepoDir.length) {
                        path = ".";
                    } else {
                        path = parentDirName.substring(testRepoDir.length + 1);
                    }

                    files.push({
                        path: path,
                        name: fileName,
                        isDir: fileStats.isDirectory(),
                        size: fileStats.size
                    });
                });

            const format = req.query.format || 'json';
            if (format == 'pretty') {
                res.header('Content-Type', 'text/html');
                const maxFileSizeLen = Math.max(...files.map(f => helpers.humanFileSize(f.size).length));
                const fileListContents = files.map(f => {
                    const size = helpers.padLeft(helpers.humanFileSize(f.size), maxFileSizeLen);
                    const type = f.isDir ? 'D' : 'F';
                    const klass = f.isDir ? 'dir' : 'file';
                    const relativePath = path.join(f.path, f.name);
                    return `${size}|${type}|<a class="${klass}" href="/api/repo?path=${relativePath}">${relativePath}</a>`;
                }).join('\n')
                return res.send(`
                    <html>
                    <head>
                        <style>
                            a, a:visited {
                                color: black;
                                text-decoration: none !important;
                            }
                            .dir {
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <pre>${fileListContents}</pre>
                    </body>
                    </html>
                `);
            } else {
                return res.json(files);
            }
        } catch (err) {
            return res.status(500).send(err.message);
        }
    });

    // Reset the database
    apiRouter.get('/reset', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        const db = dbManager.getDb();
        try {
            await db.resetDb();
            res.send(
                `Database was reset successfully.<br><br>
            <a href="/" style="border:1px solid gray; padding: 10; border-radius: 5px; display: inline-block; text-decoration: none; color: black;">
                Go back home
            </a>`);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });

    // Parse the test repo (tests, templates, etc.)
    apiRouter.get('/parse-repo', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        try {
            await testRepo.parseTestRepo();
            res.send('Test repo was parsed successfully');
        } catch (e) {
            res.status(500).send(e.message);
        }
    });

    // Get screenshot
    apiRouter.get('/screenshot/:fileName', function (req, res) {
        const screenshotsDir = path.join(
            dirs.workingDir(),
            'uploads',
            'screenshots');
        const screenshotPath = path.normalize(path.join(
            screenshotsDir,
            req.params.fileName.trim()));

        // Prevent sneaky individuals to use relative paths for requesting files
        // outside of the "screenshots" directory.
        if (!helpers.pathIsChildOf(screenshotsDir, screenshotPath)) {
            return res.status(400).end();
        }

        // We use a JS interval to check for the existence of the screenshot
        // file every 1 second. We take this approach because screenshots are
        // uploaded by test actors asynchronously, so it might take some time
        // for the image files to arrive on the server.
        const intervalId = setInterval(tryGetScreenShot, 1000);

        const timeStarted = Date.now();

        function tryGetScreenShot() {
            try {
                if (helpers.fileExists(screenshotPath)) {
                    clearInterval(intervalId);
                    res.sendFile(screenshotPath);
                } else {
                    if (Date.now() - timeStarted > 10000) {
                        clearInterval(intervalId);
                        res.status(404).send('Screenshot file not found');
                    }
                }
            } catch (err) {
                clearInterval(intervalId);
                res.status(500).send(err.message || 'Internal server error');
            }
        }
    });

    // Upload screenshot
    const screenShotsDir = path.join(dirs.workingDir(), 'uploads', 'screenshots');
    const uploadScreenshot = multer({ dest: screenShotsDir });
    apiRouter.post('/screenshot', uploadScreenshot.single('screenshot'), async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const screenshotFilePath = path.join(
                dirs.workingDir(),
                'uploads',
                'screenshots',
                req.file.originalname);

            // Make sure destination file doesn't exist already 
            if (helpers.fileExists(screenshotFilePath)) {
                helpers.deleteFile(screenshotFilePath);
            }

            // Rename multer temp file to the original file name
            await thenify(fs.rename)(req.file.path, screenshotFilePath);

            res.send(200);
        } catch (err) {
            res.status(500).send((err && err.message) || 'Unknown error').end();
        }
    });

    // Create test session based on a session template file [DEPRECATED]
    apiRouter.post('/session/from-template', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        if (!req.body) {
            return res.status(400).send("The request had no payload");
        }

        try {
            const templateAsset: TestAssetName = req.body.template;
            templateAsset.path = templateAsset.path || "/";
            if (!templateAsset || !templateAsset.name.trim()) {
                return res.status(400).send("Template name is missing from the request payload");
            }

            const template = await testRepo.getSessionTemplate(templateAsset);
            const createSessionResult = await sessionHelper.createSession(template);
            res.status(201).json(createSessionResult).end();
        } catch (err) {
            return res.status(500).send((err && err.message) || 'Unknown error').end();
        }
    });

    // Create test session
    apiRouter.post('/session', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        if (!req.body) {
            return res.status(400).send('The request did not contain any payload');
        }

        // If the "template" property is present, get session details from
        // the specified template file
        let templateTests: TestAssetName[] = [];
        let template: TestSessionTemplate = { tests: [] };
        if (req.body.template) {
            template = await testRepo.getSessionTemplate(req.body.template);
            if (!template) {
                const templatePartialPath = path.join(req.body.template.path, req.body.template.name);
                return res.status(400).send(`Template file ${templatePartialPath} was not found`);
            }
            templateTests = await testRepo.getTestsForTemplate(testRepo.getAllTestInfos(), template);
        }

        // Session properties specified directly in the request body take
        // priority to the ones in the template
        const sessionProps: TestSessionProperties = {
            actorTags: req.body.actorTags || template.actorTags || [],
            environment: req.body.environment || template.environment || null,
            maxIterations: req.body.maxIterations || template.maxIterations || 1,
            sessionLabel: req.body.sessionLabel || template.sessionLabel || null,
            tests: testRepo.mergeTestAssets(req.body.tests || [], templateTests)
        };

        // Curate actor tags. Allow the actor tags to be specified both as
        // array and CSV list, for backward compatibility.
        if (Array.isArray(sessionProps.actorTags)) {
            sessionProps.actorTags = sessionProps.actorTags
                .filter((t) => t.length > 0);
        } else if (typeof sessionProps.actorTags === 'string') {
            sessionProps.actorTags = (sessionProps.actorTags as string)
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
        }

        if (!sessionProps.tests || !sessionProps.tests.length) {
            return res.status(400).send('The API call did not specify any tests to run');
        }

        sessionHelper.createSession(sessionProps)
            .then((createSessionResult) => {
                res.status(201).json(createSessionResult).end();
            })
            .catch((err) => {
                if (err.name === constants.error.NO_MATCHING_TESTS) {
                    res.status(404).send(err.message).end();
                } else {
                    res.status(500).json(err).end();
                }
            });
    });

    // Get test session details
    // GET /api/session/123?format={json | junit}
    apiRouter.get('/session/:sessionId?', async function (req, res) {
        try {
            let sessionId = parseInt(req.params.sessionId);
            let format = req.query.format || 'json';

            const db = dbManager.getDb();
            let testSession = await db.getSession(sessionId);

            if (!testSession) {
                res.status(404).send(helpers.format('Session {0} not found', sessionId));
            } else {
                sessionHelper.populateCounts(testSession);

                switch (format) {
                    // JUNIT XML FORMAT
                    case 'junit':
                        const testSuiteElem = xml.create('testsuite', { encoding: 'utf-8' });

                        testSuiteElem.attribute('name', testSession.label);
                        testSuiteElem.attribute('tests', testSession.testCounts.total);
                        testSuiteElem.attribute('failures', testSession.testCounts.failed);
                        testSuiteElem.attribute('time', ((testSession.timeCompleted - testSession.timeStarted) / 1000).toFixed(2));

                        for (const test of testSession.tests) {
                            if (test.isDataDriven) {
                                for (const subtest of test.subtests) {
                                    const testElem = testSuiteElem.element('testcase', {
                                        classname: '',
                                        name: path.join(
                                            testRepo.normalizePartialPath(test.path),
                                            testRepo.normalizePartialPath(test.name)) +
                                            ` [${subtest.currentDataRecordIndex + 1}]`,
                                        time: ((test.timeCompleted - test.timeStarted) / 1000).toFixed(2)
                                    });
                                    prepareTestElement(test, testElem);
                                }
                            } else {
                                const testElem = testSuiteElem.element('testcase', {
                                    classname: '',
                                    name: path.join(
                                        testRepo.normalizePartialPath(test.path),
                                        testRepo.normalizePartialPath(test.name)),
                                    time: ((test.timeCompleted - test.timeStarted) / 1000).toFixed(2)
                                });
                                prepareTestElement(test, testElem);
                            }
                        }

                        const junitXmlDoc = testSuiteElem.end();
                        res.header('Content-Type', 'text/xml');
                        return res.send(junitXmlDoc);
                    // JSON FORMAT
                    default:
                        delete (testSession as any)._id;
                        return res.json(testSession);
                }
            }
        } catch (err) {
            return res.status(500).send(err.message);
        }

        function prepareTestElement(test: TestContext, testElem: xml.XMLElementOrXMLNode) {
            if (test.result === constants.testResult.FAILED) {
                const stackTraces = [];
                let actionNo = 0;
                for (const action of test.actions) {
                    actionNo++;
                    if (action.result === constants.actionResult.FAILED) {
                        stackTraces.push(
                            `==================== TEST ACTION FAILED ====================\n` +
                            `ACTION: ${actionNo} of ${test.actions.length} | ${action.action}\n` +
                            `DESCRIPTION: ${action.description}\n` +
                            (action.screenshot ? `SCREENSHOT: ${action.screenshot}\n` : '') +
                            (action.macroStack && action.macroStack.length ? `MACRO STACK: ${action.macroStack.join(' -> ')}\n` : '') +
                            `STACK TRACE:\n` +
                            action.stackTrace);
                    }
                }

                const combinedTraces = stackTraces.join('\n');
                testElem.element('failure', { type: 'N/A' }, combinedTraces);
            }
        }
    });

    // Cancel test session
    apiRouter.delete('/session/:sessionId', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        let sessionId = parseInt(req.params.sessionId);

        const db = dbManager.getDb();
        let testSession = await db.getSession(sessionId);
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
                    await db.updateActor(+actorId, { testSessionId: null });
                }

                // Cancel session
                await db.updateSession(sessionId, {
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
    apiRouter.get('/session/:sessionId/log?', function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        let sessionId = parseInt(req.params.sessionId);
        let format = req.query.format || 'pretty';

        let logFilePath = path.join(dirs.workingDir(), 'logs', sessionId + '.log');
        if (!helpers.fileExists(logFilePath)) {
            return res.status(404).send(`Log file not found: ${logFilePath}`);
        }

        /** The maximum size allowed for the size of the response, in bytes. */
        const contentMaxSize = 3 * 1024 * 1024;

        if (format === 'json') {
            res.header('Content-Type', 'application/json');

            const responseContentArray = [];
            let processedLogSize = 0;
            let readerIsClosed = false;

            let lineReader = readline.createInterface({
                input: require('fs').createReadStream(logFilePath)
            });

            lineReader.on('line', function (line: string) {
                processedLogSize += line.length;

                if (processedLogSize < contentMaxSize) {
                    responseContentArray.push(JSON.parse(line));
                } else {
                    if (!readerIsClosed) {
                        res.header('X-OpenTest-Partial-Data', 'true');
                        lineReader.close();
                        readerIsClosed = true;
                    }
                }
            });

            lineReader.on('close', function (line) {
                return res.json(responseContentArray);
            });
        } else if (format === 'pretty') {
            res.header('Content-Type', 'text/plain');

            const responseContentArray = [];
            let processedLogSize = 0;
            let readerIsClosed = false;

            let lineReader = readline.createInterface({
                input: require('fs').createReadStream(logFilePath)
            });

            lineReader.on('line', function (line: string) {
                processedLogSize += line.length;

                if (processedLogSize < contentMaxSize) {
                    responseContentArray.push(prettyFormatLogLine(JSON.parse(line)));
                } else {
                    if (!readerIsClosed) {
                        res.header('X-OpenTest-Partial-Data', 'true');
                        lineReader.close();
                        readerIsClosed = true;
                    }
                }
            });

            lineReader.on('close', function (line) {
                return res.send(responseContentArray.join('\n'));
            });
        } else if (format === 'download') {
            res.header('Content-Type', 'text/plain');
            res.header(
                'Content-Disposition',
                util.format('attachment; filename="%s"',
                    sessionId + '.log'));

            const responseContentArray = [];

            let lineReader = readline.createInterface({
                input: require('fs').createReadStream(logFilePath)
            });

            lineReader.on('line', function (line: string) {
                const lineObj = JSON.parse(line);
                responseContentArray.push(prettyFormatLogLine(lineObj));
            });

            lineReader.on('close', function (line) {
                return res.send(responseContentArray.join('\n'));
            });
        } else if (format === 'download-raw') {
            res.header('Content-Type', 'text/plain');
            res.header(
                'Content-Disposition',
                util.format('attachment; filename="%s"',
                    sessionId + '.log'));

            return res.sendFile(logFilePath);
        } else if (format === 'download-json') {
            res.header('Content-Type', 'text/plain');
            res.header(
                'Content-Disposition',
                util.format('attachment; filename="%s"',
                    sessionId + '.json'));

            const responseContentArray = [];

            let lineReader = readline.createInterface({
                input: require('fs').createReadStream(logFilePath)
            });

            lineReader.on('line', function (line: string) {
                responseContentArray.push(JSON.parse(line));
            });

            lineReader.on('close', function (line) {
                return res.send(JSON.stringify(responseContentArray));
            });
        }

        function prettyFormatLogLine(lineObj) {
            const time = helpers.padRight(moment(lineObj.time).format('HH:mm:ss'), 8) + ' | ';
            const actor = helpers.padRight(lineObj.actorType || '', 5) + ' | ';
            return `${time}${actor}${lineObj.msg}`;
        }
    });

    // Create log entry
    apiRouter.post('/session/:sessionId/log', function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

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
                case 'trace': log.trace(extras, message); break;
                case 'warn': log.warn(extras, message); break;
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

        const db = dbManager.getDb();
        const testSession = await db.getSession(sessionId);
        if (!testSession) {
            return res.status(404).send(helpers.format('Session {0} not found', sessionId));
        }

        if (testSession.status === constants.testSessionStatus.STARTED) {
            const currentTest = testSession.tests[testSession.currentTestIndex];

            if (!currentTest) {
                let log = logManager.getSessionLog(sessionId);
                const errorMessage = helpers.format(
                    "Failed to access the currently executing test for session {0}. " +
                    "The current test index for the session was {1}.",
                    req.params.sessionId,
                    testSession.currentTestIndex)
                log.error(errorMessage);
                return res.status(500).send(errorMessage);
            }

            res.json({
                currentDataRecordIndex: currentTest.currentDataRecordIndex,
                currentIteration: testSession.currentIteration,
                currentTestIndex: testSession.currentTestIndex,
                currentTestPath: currentTest.path,
                currentTestName: currentTest.name,
                /** This property is to be deleted once we completely
                 * remove support for the "step" terminology */
                currentStepIndex: testSession.currentSegmentIndex,
                currentSegmentIndex: testSession.currentSegmentIndex,
                environment: testSession.environment,
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

    function updateTestSegment(req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        const sessionId = parseInt(req.params.sessionId);
        const actorId = parseInt(req.params.actorId);
        const testIndex = req.params.testIndex;
        const segmentIndexStr = req.params.segmentIndex;

        const db = dbManager.getDb();

        lock.acquire(updateTestSegmentLockKey, async function (done) {
            try {
                const segmentIndex = parseInt(segmentIndexStr);
                await db.updateActorSegment(sessionId, actorId, testIndex, segmentIndex, req.body);
                res.end();
            } catch (err) {
                console.error(err);
                res.status(500).send(err.message);
            }
            done();
        });
    }

    // Update a test segment (old api - to be removed)
    apiRouter.put('/session/:sessionId/actor/:actorId/test/:testIndex/step/:segmentIndex', updateTestSegment);

    // Update a test segment (new api)
    apiRouter.put('/session/:sessionId/actor/:actorId/test/:testIndex/segment/:segmentIndex', updateTestSegment);

    // Report a critical error that occurred in one of the actors, which means
    // the test session needs to be terminated
    apiRouter.put('/session/:sessionId/actor/:actorId/critical-error', async function (req, res) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        let sessionId = parseInt(req.params.sessionId);
        let actorId = parseInt(req.params.actorId);
        let errorInfo = req.body;

        let log = logManager.getSessionLog(sessionId);
        log.error(helpers.format(
            'Actor {0} reported a critical error while executing session {1}. Error info: {2}',
            actorId,
            sessionId,
            errorInfo));
        await sessionHelper.cancelSessionById(sessionId);
        res.end();
    });

    // Get session-scoped shared data
    apiRouter.get('/session/:sessionId/data', async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const sessionId = parseInt(req.params.sessionId);
            const testIndex = req.params.testIndex;

            const db = dbManager.getDb();
            const testSession = await db.getSession(sessionId);
            if (testSession) {
                res.send(testSession.sessionData || {});
            } else {
                res.status(404).end(util.format('Test session %s not found', sessionId));
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Update session-scoped shared data
    apiRouter.put('/session/:sessionId/data', async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const sessionId = parseInt(req.params.sessionId);
            const testIndex = req.params.testIndex;
            const newData = req.body;

            const db = dbManager.getDb();
            const testSession = await db.getSession(sessionId);
            if (testSession) {
                let sessionData = testSession.sessionData || {};
                Object.assign(sessionData, newData);
                await db.updateSession(sessionId, { sessionData: sessionData });
                res.end();
            } else {
                res.status(404).send(util.format('Test session %s not found', sessionId));
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Get test-scoped shared data
    apiRouter.get('/session/:sessionId/test/:testIndex/data', async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const sessionId = parseInt(req.params.sessionId);
            const testIndex = req.params.testIndex;

            const db = dbManager.getDb();
            const testSession = await db.getSession(sessionId);
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
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Update test-scoped shared data
    apiRouter.put('/session/:sessionId/test/:testIndex/data', async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const sessionId = parseInt(req.params.sessionId);
            const testIndex = req.params.testIndex;
            const newData = req.body;

            const db = dbManager.getDb();
            const testSession = await db.getSession(sessionId);
            if (testSession) {
                let sessionTests = testSession.tests;
                var test = sessionTests[testIndex];
                if (!test) {
                    return res.status(404).send(util.format('Test index %s was not found', testIndex));
                }

                test.sharedData = test.sharedData || {};
                Object.assign(test.sharedData, newData);
                await db.updateSession(sessionId, { tests: sessionTests });
                return res.end();
            } else {
                return res.status(404).send(util.format('Test session %s not found', sessionId));
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    /** Record the fact that a checkpoint action failed for a specific test. This
     * will be used later on to decide whether the test passed or failed. */
    apiRouter.put('/session/:sessionId/checkpoint-failed?', async function (req, res) {
        try {
            if (isReadOnlyRouter) {
                return res.status(401).send("Unauthorized");
            }

            const sessionId = parseInt(req.params.sessionId);
            const testIndex = parseInt(req.query.test);
            const subTestIndex = parseInt(req.query.subtest);

            if (req.query.hasOwnProperty("test") && !Number.isInteger(testIndex)) {
                return res.status(400).send(util.format(
                    'The "test" query string parameter value "%s" is invalid',
                    req.query.test));
            }

            if (req.query.hasOwnProperty("subtest") && !Number.isInteger(subTestIndex)) {
                return res.status(400).send(util.format(
                    'The "subtest" query string parameter value "%s" is invalid',
                    req.query.subtest));
            }

            const db = dbManager.getDb();
            const testSession = await db.getSession(sessionId);
            if (testSession) {
                let sessionTests = testSession.tests;
                var test = sessionTests[testIndex];
                if (!test) {
                    return res.status(404).send(util.format('Test index %s was not found', testIndex));
                }

                test.checkpointFailed = true;

                if (Number.isInteger(subTestIndex)) {
                    if (!test.isDataDriven) {
                        return res.status(400).send(util.format(
                            'We received the "subtest" query string parameter, but test index %s is not a data-driven test',
                            testIndex));
                    }

                    test.subtests = test.subtests || [];
                    test.subtests[subTestIndex] = test.subtests[subTestIndex] || sessionHelper.newSubtest();
                    test.subtests[subTestIndex].checkpointFailed = true;
                }

                // Write the updated data to the DB
                await db.updateSession(sessionId, { tests: sessionTests });
                return res.end();
            } else {
                return res.status(404).send(util.format('Test session %s not found', sessionId));
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Get all test sessions
    apiRouter.get('/sessions?', async function (req, res) {
        const includeActions = (req.query.actions !== undefined) ? req.query.actions === 'true' : false;
        const includeSegments = (req.query.segments !== undefined) ? req.query.segments === 'true' : false;
        const includeTests = (req.query.tests !== undefined) ? req.query.tests === 'true' : false;
        const limit = (req.query.limit !== undefined) ? parseInt(req.query.limit) || 100 : 100;

        const db = dbManager.getDb();
        var dbSessions = await db.getSessions({ limit: limit });
        // Remove unnecessary data properties from response
        // payload for performance reasons
        dbSessions = dbSessions.map(session => {
            sessionHelper.populateCounts(session);

            delete (session as any)._id;

            if (includeTests || includeActions) {
                for (const test of session.tests) {
                    cleanUpTest(test);

                    if (test.subtests && test.subtests.length) {
                        // This is a data-driven test
                        for (const subTest of test.subtests) {
                            cleanUpTest(subTest);
                        }
                    }
                }
            } else {
                delete session.tests;
            }

            return session;
        });

        return res.json(dbSessions);

        function cleanUpTest(test: SubtestContext) {
            if (!includeActions) { delete test.actions; }
            if (!includeSegments) { delete test.segments; }

            // Delete action arguments for read-only router, as they
            // might potentially contain sensitive information
            if (isReadOnlyRouter && test.actions && test.actions.length) {
                test.actions.forEach((action) => {
                    delete action.args;
                    delete action.stackTrace;
                });
            }
        }
    });

    // Get the contents of a test asset file
    apiRouter.get('/test-asset', async function (req: express.Request, res: express.Response) {
        if (isReadOnlyRouter) {
            return res.status(401).send("Unauthorized");
        }

        const config = configLoader.getConfig();

        type AssetType = 'custom' | 'data' | 'image' | 'macro' | 'script' | 'test';
        const assetType: AssetType = (req.query.type || "").trim();
        const partialPath: string = (req.query.path || "").trim();
        const environment: string = (req.query.env || "").trim();

        try {
            let fullPath: string;

            switch (assetType) {
                case 'custom':
                    fullPath = path.join(config.testRepoDir, 'custom', partialPath);
                    break;
                case 'data':
                    fullPath = findDataFile(partialPath, environment);
                    break;
                case 'image':
                    fullPath = path.join(config.testRepoDir, 'images', partialPath);
                    break;
                case 'macro':
                    fullPath = findMacroFile(partialPath);
                    break;
                case 'script':
                    fullPath = path.join(config.testRepoDir, 'scripts', partialPath);
                    break;
                case 'test':
                    fullPath = findTestFile(partialPath);
                    break;
                default:
                    res.status(404).send(
                        `Asset type ${assetType} is not supported. Please make sure ` +
                        `the "type" parameter is valid and that you are not using an ` +
                        `outdated version of the sync service.`);
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
                res.status(404).send(`Could not find ${assetType} file ${partialPath}`);
            }
        } catch (err) {
            res.status(500).send(err.message);
        }

        function findDataFile(partialPath: string, environment: string): string {
            let fullPath: string;

            // The environment parameter can either point to a single environment dir,
            // or may contain multiple environment dirs separated by "+".
            var environments = environment
                .split('+')
                .reverse()
                .map(env => env.trim())
                .filter(env => env != '');

            for (let currentEnv of environments) {
                // Look for YAML in environment dir
                fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data-env', currentEnv, partialPath), 'yaml');
                if (helpers.fileExists(fullPath)) {
                    return fullPath;
                }

                // Look for YML in environment dir
                fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data-env', currentEnv, partialPath), 'yml');
                if (helpers.fileExists(fullPath)) {
                    return fullPath;
                }

                // Look for CSV in environment dir
                fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data-env', currentEnv, partialPath), 'csv');
                if (helpers.fileExists(fullPath)) {
                    return fullPath;
                }
            }

            // Look for YAML in data dir
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data', partialPath), 'yaml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            // Look for YML in data dir
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data', partialPath), 'yml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            // Look for CSV in data dir
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'data', partialPath), 'csv');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            return null;
        }

        function findMacroFile(partialPath: string): string {
            let fullPath: string;

            // Look for YAML file
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'macros', partialPath), 'yaml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            // Look for YML file
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'macros', partialPath), 'yml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            return null;
        }

        function findTestFile(partialPath: string): string {
            let fullPath: string;

            // Look for YAML file
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'tests', partialPath), 'yaml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            // Look for YML file
            fullPath = helpers.addExtension(path.join(config.testRepoDir, 'tests', partialPath), 'yml');
            if (helpers.fileExists(fullPath)) {
                return fullPath;
            }

            return null;
        }
    });

    // Get the list of tests for a test session template
    apiRouter.get('/template/tests', async function (req: express.Request, res: express.Response) {
        const partialPath: string = testRepo.normalizePartialPath(req.query.path);
        const template = testRepo.getSessionTemplate({ name: path.basename(partialPath), path: path.dirname(partialPath) });
        res.json(await testRepo.getTestsForTemplate(testRepo.getAllTestInfos(), template));
    });

    // Get session templates
    apiRouter.get('/templates', function (req, res) {
        res.setHeader("Cache-Control", "no-cache");
        res.json(testRepo.getAllTemplates());
    });

    // Get test catalog
    apiRouter.get('/tests', function (req, res) {
        res.setHeader("Cache-Control", "no-cache");
        res.json(testRepo.getAllTestInfos());
    });

    return apiRouter;
}
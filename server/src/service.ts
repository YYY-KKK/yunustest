// The dirs module has to be imported in the start of the script, before
// anyone has a chance to change the current working directory
import * as dirs from './lib/dirs';

// The config loader has to be imported before most other modules,
// to make sure the config file is loaded and available to use
import * as configLoader from './lib/config-loader';

import * as buildInfo from './lib/build-info';
import * as dbManager from './lib/db-manager';
import * as actorHelper from './lib/actor-helper';
import * as expressApp from './express-app';
import * as http from 'http';
import * as notifier from './lib/websocket-notifier';
import * as sessionHelper from './lib/session-helper';
import * as path from 'path';
import * as testRepo from './lib/test-repo';
import * as _ from 'underscore';

export function start(options: any = {}) {
    if (options.workDir) {
        dirs.setWorkingDir(options.workDir);
    }

    const buildInfoObj = buildInfo.getBuildInfo();
    console.log(`\nOpenTest server ${buildInfoObj.version}, commit ${buildInfoObj.commitSha}\n`);
    console.log(`Running in working directory "${dirs.workingDir()}"`);

    try {
        configLoader.loadConfig('server.yaml');
    } catch (err) {
        console.error('ERROR: Configuration error!');
        console.error('ERROR: ' + err.message + '\n');
        process.exit(1);
    }

    dbManager.initDb();

    process.on('unhandledRejection', err => {
        console.log('ERROR: We detected an unhandled promise rejection. The server will be terminated. The error message was: ', err.message, '\n');
        console.log(err.stack);
        process.exit(1);
    });

    process.on('uncaughtException', err => {
        console.log('ERROR: We detected an unhandled exception. The server will be terminated. The error message was: ', err.message, '\n');
        console.log(err.stack);
        process.exit(1);
    });

    const config = configLoader.getConfig();
    console.log(`Using test repo directory "${path.normalize(config.testRepoDir)}"`);

    testRepo.parseTestRepo()
        .then(() => {
            if (config.watchTestRepo) {
                testRepo.setupTestRepoWatcher();
            }
        })
        .catch((err) => {
            console.error("ERROR: Failed parsing the test repo. " + err.message + '\n');
            process.exit(1);
        });

    actorHelper.startCleanupInterval();
    sessionHelper.startCleanupInterval();

    const server = http.createServer(expressApp.createApp());
    notifier.initialize(server);

    const port = config.serverPort;
    server.listen(port, function () {
        process.title = `sync server (${port})`;
        console.log(`The OpenTest server is listening on port ${port}`);
        console.log(`Open a browser and navigate to http://localhost:${port}\n`);
    });

    if (config.readOnlyPort) {
        const readOnlyServer = http.createServer(expressApp.createApp({ readOnly: true }));

        const readOnlyPort = config.readOnlyPort;
        readOnlyServer.listen(readOnlyPort, function () {
            console.log(`The read-only view is running on port ${readOnlyPort}`);
        });
    }
}
// The dirs module has to be imported in the start of the script, before
// anyone has a chance to change the current working directory
import * as dirs from './lib/dirs';

// The config loader has to be imported before most other modules,
// to make sure the config file is loaded and available to use
import * as configLoader from './lib/config-loader';

import * as buildInfo from './lib/build-info';
import * as dbManager from './lib/db-manager';
import * as actorsCleanup from './lib/actor-helper';
import { expressApp } from './express-app';
import * as http from 'http';
import { sessionSettings } from './lib/express-session';
import * as sessionHelper from './lib/session-helper';
import * as socketIoFactory from 'socket.io';
import * as path from 'path';
import * as testRepo from './lib/test-repo';
import * as _ from 'underscore';

export function start(options: any = {}) {
    if (options.workDir) {
        dirs.setWorkingDir(options.workDir);
    }

    console.log(`\nOpenTest server ${buildInfo.version}, commit ${buildInfo.commitSha}\n`);
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
        console.log(err);
        process.exit(1);
    });

    process.on('uncaughtException', err => {
        console.log('ERROR: We detected an unhandled exception. The server will be terminated. The error message was: ', err.message, '\n');
        console.log(err);
        process.exit(1);
    });

    const config = configLoader.getConfig();

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

    actorsCleanup.startCleanupInterval();
    sessionHelper.startCleanupInterval();

    var server = http.createServer(expressApp);
    var io = socketIoFactory(server);

    io.on('connection', function (socket) {
        console.log('Established socket.io connection for session ' + (socket.handshake as any).session.sessionId);
    });

    var ioSession = require('socket.io-express-session');
    io.use(ioSession(sessionSettings));

    var port = config.serverPort;
    server.listen(port, function () {
        process.title = `sync server (${port})`;
        console.log(`Server is listening on port ${port}`);
        console.log(`Open a browser and navigate to http://localhost:${port}\n`);
    });
}
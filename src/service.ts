// The dirs module has to be imported first, before anyone has a
// chance to change the current working directory
import * as dirs from './lib/dirs';

// The config loader has to be imported before other modules, to
// make sure the config file was loaded and available to use
import * as configLoader from './lib/config-loader';
try {
    configLoader.loadConfig('server.yaml');
} catch (err) {
    console.error('ERROR: Configuration error!');
    console.error('ERROR: ' + err.message + '\n');
    process.exit(1);
}

import * as _ from 'underscore';
import * as actorsCleanup from './lib/actor-helper';
import app from './lib/app';
import { memDb, initDb } from './lib/db';
import * as http from 'http';
import { sessionSettings } from './lib/express-session';
import * as sessionHelper from './lib/session-helper';
import * as socketIoFactory from 'socket.io';
import * as path from 'path';
import * as testRepo from './lib/test-repo';

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

let config = configLoader.getConfig();

initDb();

testRepo.parseTestRepo()
    .then(() => {
        testRepo.setupTestRepoWatcher();
    })
    .catch((err) => {
        console.error("ERROR: Failed parsing the test repo. " + err.message + '\n');
        process.exit(1);
    });

actorsCleanup.startCleanupInterval();
sessionHelper.startCleanupInterval();

var server = http.createServer(app);
var io = socketIoFactory(server);

io.on('connection', function (socket) {
    console.log('Established socket.io connection for session ' + (socket.handshake as any).session.sessionId);
});

var ioSession = require('socket.io-express-session');
io.use(ioSession(sessionSettings));

var port = config.serverPort;
server.listen(port, function () {
    console.log('Server is listening on port ' + port);
    console.log('Open a browser and navigate to http://localhost:' + port + '\n');
});
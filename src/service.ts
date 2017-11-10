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
import * as chokidar from 'chokidar';
import { memDb, initDb } from './lib/db';
import * as http from 'http';
import { sessionSettings } from './lib/express-session';
import * as sessionHelper from './lib/session-helper';
import * as socketIoFactory from 'socket.io';
import * as path from 'path';
import * as testRepo from './lib/test-repo';

process.on('unhandledRejection', err => {
    console.log('ERROR: We detected an unhandled promise rejection. The error message was: ', err.message);
});

initDb();

testRepo.parseTestRepo().catch((err) => {
    console.error("ERROR: Failed parsing the test repo. " + err.message + '\n');
    process.exit(1);
});

let config = configLoader.getConfig();
let testRepoDirFullPath = path.resolve(config.testRepoDir);

var watcher = chokidar.watch(testRepoDirFullPath, {
    ignored: /(^|[\/\\])\../,
    ignoreInitial: true
});

function reloadRepo(filePath: string, fileStat) {
    console.log('Detected update: ' + filePath);
    testRepo.parseTestRepo();
    console.log('The test repository was reloaded');
}

var debouncedReloadRepo = _.debounce(reloadRepo, 1000);

// Watch test repo for changes and reload, as necessary
watcher
    .on('add', (filePath, fileStat) => { debouncedReloadRepo(filePath, fileStat); })
    .on('change', (filePath, fileStat) => { debouncedReloadRepo(filePath, fileStat); })
    .on('unlink', (filePath, fileStat) => { debouncedReloadRepo(filePath, fileStat); });

actorsCleanup.startCleanupInterval();
sessionHelper.startCleanupInterval();

var server = http.createServer(app);
var io = socketIoFactory(server);

io.on('connection', function (socket) {
    console.log('Established socket.io connection for session ' + (socket.handshake as any).session.sessionId);
});

var ioSession = require('socket.io-express-session');
io.use(ioSession(sessionSettings));

var port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log('Server is listening on port ' + port);
    console.log('Open a browser and navigate to http://localhost:' + port + '\n');
});
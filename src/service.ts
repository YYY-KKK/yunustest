import * as _ from 'underscore';
import * as actorsCleanup from './lib/actor-cleanup';
import app from './lib/app';
import * as chokidar from 'chokidar';
import * as configLoader from './lib/configLoader';
import { memDb, initDb } from './lib/db';
import * as http from 'http';
import { sessionSettings } from './lib/express-session';
import * as sessionsCleanup from './lib/session-cleanup';
import * as socketIoFactory from 'socket.io';
import * as path from 'path';
import * as testRepo from './lib/testRepo';

try {
    configLoader.loadConfig('config.yaml');
} catch (err) {
    console.log(err);
    process.exit(1);
}

initDb();

testRepo.parseTestRepo();

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

actorsCleanup.start();
sessionsCleanup.start();

var server = http.createServer(app);
var io = socketIoFactory(server);

io.on('connection', function (socket) {
    console.log('Established socket.io connection for session ' + (socket.handshake as any).session.sessionId);
});

var ioSession = require('socket.io-express-session');
io.use(ioSession(sessionSettings));

var port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log('App listening on port ' + port + '...');
    console.log('Open a browser and navigate to http://localhost:' + port);
});
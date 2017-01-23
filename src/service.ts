import * as actorsCleanup from './lib/actor-cleanup';
import app from './lib/app';
import * as configLoader from './lib/configLoader';
import { memDb, initDb } from './lib/db';
import * as http from 'http';
import session from './lib/session';
import * as sessionsCleanup from './lib/session-cleanup';
import * as socketIoFactory from 'socket.io';
import * as testRepo from './lib/testRepo';

try {
  configLoader.loadConfig('config.yaml');
} catch(err) {
  console.log(err);
  process.exit(1);
}

initDb();
testRepo.parseTestRepo();
actorsCleanup.start();
sessionsCleanup.start();

var server = http.createServer(app);
var io = socketIoFactory(server);

io.on('connection', function(socket) {
	console.log('Established socket.io connection for session ' + (socket.handshake as any).session.sessionId);
});

var ioSession = require('socket.io-express-session');
io.use(ioSession(session));

var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log('App listening on port ' + port + '...');
  console.log('Open a browser and navigate to http://localhost:' + port);
});
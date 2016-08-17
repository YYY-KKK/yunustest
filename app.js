var rek = require('rekuire');
var actorsCleanup = rek('lib/actors-cleanup');
var express = require('express');
var favicon = require('serve-favicon');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session')({
	cookie: {
		// Expire session 8 hours after last activity
		maxAge: 8 * 60 * 60 * 1000
	},
	name: 'sid',
	resave: false,
	rolling: true,
	saveUninitialized: true,
	secret: '2Pdkf87H8hS2g9JdO6Mz'
});

app.set('views', __dirname + '/views');
app.engine('pug', require('pug').__express);
app.set('view engine', 'pug');

app.use(session);
app.set('trust proxy', true);

app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var server = require('http').createServer(app);
var io = require('socket.io')(server);

io.on('connection', function(socket){
	console.log('Established socket.io connection for session ' + socket.handshake.session.sessionId);
});

var ioSession = require('socket.io-express-session');
io.use(ioSession(session));

app.use(function(req, res, next) {
	if (!req.session.timezone) {
		req.session.timezone = 'America/Chicago';
	}
	next();
});
app.use(require('./controllers'));
actorsCleanup.start();

var port = process.env.PORT || 3000 ;
server.listen(port, function () {
  console.log('App listening on port ' + port + '...');
  console.log('Open a browser and navigate to http://localhost:3000');
});
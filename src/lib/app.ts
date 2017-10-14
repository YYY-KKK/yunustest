import * as  bodyParser from 'body-parser';
import * as buildInfo from './build-info';
import controllers from '../controllers';
import * as  express from 'express';
import * as favicon from 'serve-favicon';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import { sessionSettings } from './express-session';

var app = express();

app.set('views', __dirname + '/../views');
app.engine('pug', require('pug').__express);
app.set('view engine', 'pug');

app.use(sessionSettings);
app.set('trust proxy', true);

app.use(express.static(__dirname + '/../public'));
app.use(favicon(__dirname + '/../public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.locals.version = buildInfo.version;
app.locals.buildDate = buildInfo.buildDate;
app.locals.commitSha = buildInfo.commitSha;
app.locals.moment = moment;

app.use(function(req, res, next) {
	if (!(req.session as any).timezone) {
		(req.session as any).timezone = 'America/Chicago';
	}
	next();
});
app.use(controllers);

export default app;
import * as  bodyParser from 'body-parser';
import * as buildInfo from './build-info';
import { apiRouter } from '../controllers/api';
import { homeRouter } from '../controllers/home';
import * as  express from 'express';
import * as favicon from 'serve-favicon';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import { sessionSettings } from './express-session';
import * as yargs from 'yargs';

export const expressApp = express();

expressApp.set('views', __dirname + '/../views');
expressApp.engine('pug', require('pug').__express);
expressApp.set('view engine', 'pug');

expressApp.use(sessionSettings);
expressApp.set('trust proxy', true);

expressApp.use(express.static(__dirname + '/../public'));
expressApp.use(favicon(__dirname + '/../public/favicon.ico'));
expressApp.use(bodyParser.json({ limit: '30mb' }));
expressApp.use(bodyParser.urlencoded({ extended: true }));

if (yargs.argv.trace) {
	expressApp.use(function (req, res, next) {
		var hasBody = (Object.keys(req.body).length > 0);
		console.log(helpers.format("{0} {1}://{2}{3}{4}",
			req.method,
			req.protocol,
			req.hostname,
			req.originalUrl,
			hasBody ? '\n' + JSON.stringify(req.body) : ''));
		next();
	});
}

expressApp.locals.version = buildInfo.version;
expressApp.locals.buildDate = buildInfo.buildDate;
expressApp.locals.commitSha = buildInfo.commitSha;
expressApp.locals.moment = moment;

expressApp.use(function (req, res, next) {
	if (!(req.session as any).timezone) {
		(req.session as any).timezone = 'America/Chicago';
	}
	next();
});

expressApp.use('/', homeRouter);
expressApp.use('/api', apiRouter);

expressApp.use(function (err, req, res, next) {
	console.error("ERROR: We detected an error in the Express module. " + err.message);
	console.error(err.stack)
	res.status(500).send('Something broke!')
})
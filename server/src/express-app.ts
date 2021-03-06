import * as  bodyParser from 'body-parser';
import * as buildInfo from './lib/build-info';
import * as apiRouter from './controllers/api';
import * as uiRouter from './controllers/ui';
import * as  express from 'express';
import * as favicon from 'serve-favicon';
import * as fs from 'fs';
import * as helpers from './lib/helpers';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import { sessionSettings } from './lib/express-session';
import * as yargs from 'yargs';

export function createApp(options?: any) {
	options = options || {};
	let expressApp: express.Express = express();

	expressApp.set('views', path.join(__dirname, 'views'));
	expressApp.engine('pug', require('pug').__express);
	expressApp.set('view engine', 'pug');

	expressApp.use(sessionSettings);
	expressApp.set('trust proxy', true);

	expressApp.use(express.static(path.join(__dirname, 'public')));
	expressApp.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
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

	const buildInfoObj = buildInfo.getBuildInfo();
	expressApp.locals.version = buildInfoObj.version;
	expressApp.locals.buildDate = buildInfoObj.buildDate;
	expressApp.locals.commitSha = buildInfoObj.commitSha;
	expressApp.locals.moment = moment;

	expressApp.use(function (req, res, next) {
		if (!(req.session as any).timezone) {
			(req.session as any).timezone = 'America/Chicago';
		}
		next();
	});

	expressApp.use('/', uiRouter.createRouter(options));
	expressApp.use('/api', apiRouter.createRouter(options));

	return expressApp;
}
import * as dbManager from '../lib/db-manager';
import * as dirs from '../lib/dirs';
import * as express from 'express';
import * as fs from 'fs';
import * as helpers from '../lib/helpers';
import * as path from 'path';
import * as moment from 'moment';
import * as readline from 'readline';

export function createRouter(options?: any) {
    options = options || {};
    const isReadOnlyRouter = options.readOnly || false;

    let uiRouter: express.Router = express.Router();

    require('moment-timezone');

    uiRouter.get('/', function (req, res) {
        res.render('home', {
            readOnlyView: isReadOnlyRouter
        });
    });

    uiRouter.get('/session/:sessionId', async function (req, res) {
        const db = dbManager.getDb();
        const sessionId = parseInt(req.params.sessionId);
        const dbTestSession = await db.getSession(sessionId);

        if (dbTestSession) {
            const testSession = helpers.clone(dbTestSession);

            res.render('session', {
                moment: moment,
                readOnlyView: isReadOnlyRouter,
                session: testSession
            });
        } else {
            res.status(404).send(helpers.format('Session {0} not found', sessionId));
        }
    });

    return uiRouter;
}
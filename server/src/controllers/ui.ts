import * as dbManager from '../lib/db-manager';
import * as dirs from '../lib/dirs';
import * as express from 'express';
import * as fs from 'fs';
import * as helpers from '../lib/helpers';
import * as path from 'path';
import * as moment from 'moment';
import * as readline from 'readline';

export const uiRouter = express.Router();

require('moment-timezone');

uiRouter.get('/', function (req, res) {
    res.render('home', {});
});

uiRouter.get('/session/:sessionId', async function (req, res) {
    const db = dbManager.getDb();
    const sessionId = parseInt(req.params.sessionId);
    const dbTestSession = await db.getSession(sessionId);

    if (dbTestSession) {
        const testSession = helpers.clone(dbTestSession);

        res.render('session', {
            moment: moment,
            session: testSession
        });
    } else {
        res.status(404).send(helpers.format('Session {0} not found', sessionId));
    }

    interface LogEntry {
        actorId?: string,
        actorType?: string,
        msg: string,
        time: string
    }

    async function readLogEntries() {
        return new Promise<LogEntry[]>((resolve, reject) => {
            let logEntries = [];
            let logFilePath = path.join(dirs.workingDir(), 'logs', sessionId + '.log');

            if (!helpers.fileExists(logFilePath)) {
                resolve(logEntries);
                return;
            }

            try {
                let inputStream = fs.createReadStream(logFilePath);
                inputStream.on('error', function(err) {
                    console.log(helpers.format('ERROR: Input stream error: ',
                        err));
                    reject(err);
                    return;
                });

                let lineReader = readline.createInterface({
                    input: inputStream
                });

                lineReader.on('line', function (line) {
                    try {
                        let lineObj = JSON.parse(line);
                        logEntries.push(lineObj);
                    } catch (err) {
                        console.log(helpers.format('ERROR: Failed parsing log line',
                            line,
                            err));
                    }
                });

                lineReader.on('close', function () {
                    resolve(logEntries);
                    return;
                });

                lineReader.on('error', function (err) {
                    console.log(helpers.format('ERROR: Readline error: ',
                        err));
                    reject(err);
                    return;
                });
            } catch (err) {
                reject(err);
                return;
            }
        });
    }
});
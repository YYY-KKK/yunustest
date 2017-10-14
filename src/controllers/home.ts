"use strict";

var appRoot = require('app-root-path').path;
import { memDb } from '../lib/db';
var express = require('express');
import * as fs from 'fs';
import * as helpers from '../lib/helpers';
import * as path from 'path';
var moment = require('moment');
import * as readline from 'readline';
var router = express.Router();

require('moment-timezone');

router.get('/', function (req, res) {
    res.render('home', {});
});

router.get('/session/:sessionId', async function (req, res) {
    let sessionId = parseInt(req.params.sessionId);
    let dbTestSession = await memDb.getMemSession(sessionId);

    if (dbTestSession) {
        let testSession = helpers.clone(dbTestSession);

        readLogEntries()
            .then(function (logEntries) {
                res.render('session', {
                    moment: moment,
                    session: testSession,
                    logEntries: logEntries && logEntries.length ? logEntries : []
                });
            })
            .catch(function (reason) {
                console.log(reason);
                res.status(500).send(reason.message);
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
            let logFilePath = path.join(appRoot, 'logs', sessionId + '.log');

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

export default router;
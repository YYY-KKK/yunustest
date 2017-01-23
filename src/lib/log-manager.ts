var appRoot = require('app-root-path').path;
import * as bunyan from 'bunyan';
var mkdirp = require('mkdirp');
import * as path from 'path';
import * as _ from 'underscore';

var appLog = bunyan.createLogger({ name: 'app' });
var sessionLogs = {};

export function getSessionLog(sessionId: any): bunyan.Logger {
    // Ensure the "logs" directory exists
    mkdirp(path.join(appRoot, 'logs'));

    let log;
    sessionId = sessionId.toString();

    if (!sessionLogs[sessionId]) {
        log = bunyan.createLogger({
            name: sessionId,
            streams: [{
                level: 'debug',
                path: path.join(appRoot, 'logs', sessionId + '.log')
            }]
        });
        sessionLogs[sessionId] = log;
    } else {
        log = sessionLogs[sessionId];
    }

    // Provide a method for clients to flush the write
    // stream to ensure all data was persisted 
    log.flushStreams = _.debounce(
        log.reopenFileStreams.bind(log),
        5000,
        true
    );

    return log;
}


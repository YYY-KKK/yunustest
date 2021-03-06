import * as Logger from 'bunyan';
import * as dirs from '../lib/dirs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as _ from 'underscore';

var appLog = Logger.createLogger({ name: 'app' });
var sessionLogs = {};

export function getSessionLog(sessionId: any): Logger {
    // Ensure the "logs" directory exists
    mkdirp.sync(path.join(dirs.workingDir(), 'logs'));

    let log;
    sessionId = sessionId.toString();

    if (!sessionLogs[sessionId]) {
        log = Logger.createLogger({
            name: sessionId,
            streams: [{
                level: 'trace',
                path: path.join(dirs.workingDir(), 'logs', sessionId + '.log')
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


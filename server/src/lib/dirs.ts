import * as helpers from './helpers';
import * as path from 'path';
import * as yargs from 'yargs';

let appRootDirPath: string = path.resolve(path.join(__dirname, '..', '..'));
let workingDirPath: string = process.cwd();

yargs.alias('w', 'workdir');

if (yargs.argv.workdir) {
    setWorkingDir(path.resolve(yargs.argv.workdir));
}

/** Returns the root directory of the Node application. */
export function appRootDir(): string {
    return appRootDirPath;
}

/** Returns the logs directory. */
export function logsDir(): string {
    return path.join(appRootDirPath, 'logs');
}

/** Returns the screenshots directory. */
export function screenshotDir(): string {
    return path.join(appRootDirPath, 'uploads', 'screenshots');
}

/** Sets the working directory where the DB files and the log files are
 * stored and where the configuration file is read from. */
export function setWorkingDir(newWorkingDir: string) {
    let normalizedPath = path.normalize(newWorkingDir);
    if (!path.isAbsolute(normalizedPath)) {
        normalizedPath = path.resolve(normalizedPath);
    }

    if (helpers.directoryExists(normalizedPath)) {
        workingDirPath = normalizedPath;
    } else {
        throw new Error(`Can't set working dir to "${normalizedPath}". Path does not exist.`);
    }
}

/** Returns the working directory where the DB files and the log files are
 * stored and where the configuration file is read from. */
export function workingDir(): string {
    return workingDirPath;
}
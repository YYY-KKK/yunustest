import * as helpers from './helpers';
import * as path from 'path';
import * as yargs from 'yargs';

let appRootDirPath: string = path.resolve(path.join(__dirname, '..', '..'));
let workingDirPath: string = process.cwd();

if (yargs.argv.workdir) {
    setWorkingDir(yargs.argv.workdir);
    console.log(`Running in working directory ${workingDir()}`);
}

/** Returns the root directory of the Node application. */
export function appRootDir(): string {
    return appRootDirPath;
}

/** Sets the working directory where the DB files and the log files are
 * stored and where the configuration file is read from. */
export function setWorkingDir(newWorkingDir: string) {
    const normalizedPath = path.normalize(newWorkingDir);
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
import * as dirs from '../lib/dirs';
import * as fs from 'fs';
import * as helpers from '../lib/helpers';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { ActorGroup } from './types';

export interface IConfig {
    acquireActorsTimeoutSec: number;
    actorGroups: ActorGroup[],
    cleanupSessionsIntervalSec: number;
    dbAdapter?: 'nedb' | 'mongodb';
    dbCompactionIntervalSec: number;
    nedbPath?: string;
    noActivityTimeoutSec: number;
    readOnlyPort: number;
    serverPort: number;
    sessionHistoryMaxCount: number;
    sessionHistoryMinCount: number;
    sessionHistoryAgeDays: number;
    testRepoDir: string;
    watchTestRepo: boolean;
}

let currentConfig = getDefaultConfig();

/** Returns the currently active configuration. */
export function getConfig() {
    return currentConfig;
}

/** Returns the default configuration. */
export function getDefaultConfig(): IConfig {
    return {
        acquireActorsTimeoutSec: 1200,
        actorGroups: [],
        cleanupSessionsIntervalSec: 10,
        dbCompactionIntervalSec: 5 * 60,
        noActivityTimeoutSec: 3600,
        readOnlyPort: null,
        serverPort: parseInt(process.env.PORT) || 3000,
        sessionHistoryMaxCount: 300,
        sessionHistoryMinCount: 50,
        sessionHistoryAgeDays: 60,
        testRepoDir: null,
        watchTestRepo: true
    };
}

/** Loads the configuration from an absolute or relative path. */
export function loadConfig(config?: string | Object) {
    currentConfig = getDefaultConfig();

    if (typeof config === 'string') {
        // Load configuration from the specified config file
        let loadedConfig = loadFromFile(config);
        Object.assign(currentConfig, loadedConfig);
    } else {
        // Load configuration from an object that was passed in
        Object.assign(currentConfig, config);
    }
}

function loadFromFile(configFile: string): IConfig {
    let config = getDefaultConfig();

    let configFilePath: string;

    if (path.isAbsolute(configFile)) {
        configFilePath = configFile;
    } else {
        configFilePath = path.normalize(path.join(dirs.workingDir(), configFile));
    }

    // Override defaults values with the ones from the config file
    if (helpers.fileExists(configFilePath)) {
        let configFile: Object = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'));

        for (let prop in configFile) {
            if (configFile.hasOwnProperty(prop)) {
                if ((config as Object).hasOwnProperty(prop)) {
                    config[prop] = configFile[prop];
                } else {
                    if (prop === 'testRepoLocation' || prop === 'testRepoDirName') {
                        console.log(helpers.format('ERROR: Configuration file "{0}" uses parameters "testRepoLocation" and/or "testRepoDirName". Please remove them and use the "testRepoDir" parameter instead. See the "config.sample.yaml" file for sample usage.',
                            configFilePath,
                            prop));
                        process.exit(1);
                    } else {
                        console.log(helpers.format('WARN: Configuration file {0} contains parameter "{1}", which doesn\'t appear to be a valid parameter name.',
                            configFilePath,
                            prop));
                    }
                }
            }
        }
    } else {
        throw new Error(helpers.format('Config file "{0}" doesn\'t exist', configFilePath));
    }

    return config;
}
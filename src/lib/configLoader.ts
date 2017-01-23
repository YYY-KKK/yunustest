var appRoot = require('app-root-path');
import * as fs from 'fs';
import * as helpers from '../lib/helpers';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface IConfig {
    dbAdapter?: 'nedb' | 'mongodb';
    nedbPath?: string,
    acquireActorsTimeoutSec: number;
    noActivityTimeoutSec: number;
    testRepoLocation: string;
    testRepoDirName: string;
}

let currentConfig = getDefaultConfig();

/** Returns the currently active configuration. */
export function getConfig() {
    return currentConfig;
}

/** Returns the default configuration. */
export function getDefaultConfig(): IConfig {
    return {
        acquireActorsTimeoutSec: 360,
        noActivityTimeoutSec: 360,
        testRepoDirName: "test-defs",
        testRepoLocation: "."
    };
}

/** Loads the configuration from an absolute or relative path, or from the
 * default config file "config.yaml", if no path is provided. */
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
        configFilePath = path.normalize(path.join(appRoot.path, configFile));
    }

    // Override defaults values with the ones from the config file
    if (helpers.fileExists(configFilePath)) {
        let configFile: Object = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'));

        for (let prop in configFile) {
            if (configFile.hasOwnProperty(prop)) {
                if ((config as Object).hasOwnProperty(prop)) {
                    config[prop] = configFile[prop];
                } else {
                    console.log(helpers.format('WARN: Configuration file {0} contains parameter "{1}", which doesn\'t appear to be a valid parameter name.',
                        configFilePath,
                        prop));
                }
            }
        }
    } else {
        throw new Error(helpers.format('Config file "{0}" doesn\'t exist', configFilePath));
    }

    return config;
}
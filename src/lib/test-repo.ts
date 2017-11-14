import * as _ from 'underscore';
import * as configLoader from '../lib/config-loader';
import * as chokidar from 'chokidar';
import * as crypto from 'crypto';
import { TestAssetName, TestInfo } from '../lib/types';
import * as fileWalker from './file-walker';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as jsYaml from 'js-yaml';
import * as jsonSchema from 'jsonschema';
import * as path from 'path';
import { ScriptEngine } from './script-engine';
import * as thenify from 'thenify';

const config = configLoader.getConfig();

let isTestRepoWatcherSetUp = false;
export let allTestInfos: TestInfo[] = [];
export let allTemplateInfos: TestInfo[] = [];

/** Add the actors and steps information to a set of TestInfo objects
 * that only contains the test names */
export function completeTestInfos(incompleteTestInfos: TestInfo[], completeTestInfos: TestInfo[]) {
    for (let incompleteTestInfo of incompleteTestInfos) {
        for (let completeTestInfo of completeTestInfos) {
            if (getAssetPartialPath(incompleteTestInfo) === getAssetPartialPath(completeTestInfo)) {
                incompleteTestInfo.actors = completeTestInfo.actors;
                incompleteTestInfo.segments = completeTestInfo.segments;
            }
        }
    }
}

/** Computes the asset partial path by concatenating the relative path
 * with the asset name (separated by "/") */
function getAssetPartialPath(assetName: TestAssetName): string {
    const assetRelativePath = helpers.trimChars(assetName.path || '', '/\\ ');
    const assetFileName = helpers.trimChars(assetName.name, '/\\ ');

    if (!assetRelativePath) {
        return assetFileName;
    } else {
        return helpers.format('{0}/{1}',
            assetRelativePath,
            assetFileName);
    }
}

/** Returns the array of TestInfo objects corresponding to an array of
 *  TestAssetName objects */
export function getTestInfos(selectionTestNames: TestAssetName[]): TestInfo[] {
    const resultTestInfos: TestInfo[] = [];

    for (let selectionTestName of selectionTestNames) {
        for (let repoTestName of allTestInfos) {
            const selectionTestFullPath = getAssetPartialPath(selectionTestName);
            const repoTestFullPath = getAssetPartialPath(repoTestName);
            if (selectionTestFullPath === getAssetPartialPath(repoTestName)) {
                resultTestInfos.push({
                    actors: repoTestName.actors,
                    dataDriven: repoTestName.dataDriven,
                    name: repoTestName.name,
                    path: repoTestName.path,
                    segments: repoTestName.segments
                });
            }
        }
    }

    return resultTestInfos;
}

export async function parseTestRepo() {
    if (!config.testRepoDir) {
        throw new Error('The test repo directory was not defined. Please make sure the path is correctly specified in the testRepoDir parameter in the server.yaml file.');
    }

    const testRepoDirFullPath = path.resolve(config.testRepoDir);

    if (!helpers.directoryExists(testRepoDirFullPath)) {
        throw new Error(helpers.format(
            'The test repo directory "{0}" doesn\'t exist. Please make sure the path is correctly specified in your server.yaml file.',
            testRepoDirFullPath
        ));
    }

    const testsDir = path.join(testRepoDirFullPath, 'tests');
    const templatesDir = path.join(testRepoDirFullPath, 'templates');

    let newTestInfos = [];
    let newTemplateInfos = [];
    const readFile = thenify(fs.readFile);

    // Recursively browse the tests directory and extract test information
    if (helpers.directoryExists(testsDir)) {
        await fileWalker.walkRecursive(testsDir, async function (parentDirName, fileName, fileStats) {
            if (fileStats.isFile()) {
                const fileFullPath = path.join(parentDirName, fileName);

                try {
                    if (path.extname(fileFullPath) === '.yaml') {
                        const fileData = await readFile(fileFullPath);
                        const testDefString = fileData.toString('utf8');
                        const testDef = jsYaml.safeLoad(testDefString);
                        const validationResult = validateTestDefinition(testDef);
                        if (validationResult.errors.length == 0) {
                            const testInfo = {
                                actors: _.unique(testDef.actors.map((a) => { return a.actorType || a.actor; })) as string[],
                                dataDriven: !!testDef.dataSet,
                                hash: crypto.createHash('sha1').update(fileData).digest('hex'),
                                name: path.basename(fileFullPath, path.extname(fileFullPath)),
                                path: path.dirname(fileFullPath).substring(testsDir.length + 1).replace(/\\/g, '/'),
                                segments: _.flatten(testDef.actors.map(
                                    (a) => {
                                        return (a.segments || a.steps).map((s) => {
                                            return s.segment || s.step || s.index;
                                        });
                                    }
                                )).sort() as number[]
                            };
                            newTestInfos.push(testInfo);
                        } else {
                            console.log(
                                helpers.format("Test definition file {0} failed validaton",
                                    fileFullPath));
                            console.log(validationResult.errors);
                        }
                    }
                } catch (err) {
                    console.log(helpers.format('WARN: Failed to parse test definition file "{0}". {1}',
                        fileFullPath,
                        err.message));
                }
            }
        });
    }

    // Sort tests by path and file name
    newTestInfos = _(newTestInfos).chain().sortBy(function (ti) {
        return ti.path;
    }).sortBy(function (ti) {
        return ti.name;
    }).value();

    allTestInfos = newTestInfos;

    // Recursively browse the templates directory and extract session template information
    if (helpers.directoryExists(templatesDir)) {
        await fileWalker.walkRecursive(templatesDir, async function (parentDirName, fileName, fileStats) {
            if (fileStats.isFile()) {
                const fileFullPath = path.join(parentDirName, fileName);

                try {
                    if (path.extname(fileFullPath) === '.yaml') {
                        const fileData = await readFile(fileFullPath);
                        const templateString = fileData.toString('utf8');
                        const template = jsYaml.safeLoad(templateString);
                        const validationResult = validateTemplateDefinition(template);
                        if (validationResult.errors.length == 0) {
                            const templateInfo = {
                                name: path.basename(fileFullPath, path.extname(fileFullPath)),
                                path: path.dirname(fileFullPath).substring(templatesDir.length + 1).replace(/\\/g, '/'),
                                ...template
                            };
                            newTemplateInfos.push(templateInfo);
                        } else {
                            console.log(
                                helpers.format("Session template file {0} failed validaton",
                                    fileFullPath));
                            console.log(validationResult.errors);
                        }
                    }
                } catch (err) {
                    console.log(helpers.format('WARN: Failed to parse session template file "{0}". {1}',
                        fileFullPath,
                        err.message));
                }
            }
        });
    }

    // Sort templates by path and file name
    newTemplateInfos = _(newTemplateInfos).chain().sortBy(function (ti) {
        return ti.path;
    }).sortBy(function (ti) {
        return ti.name;
    }).value();

    allTemplateInfos = newTemplateInfos;
}

export function setupTestRepoWatcher() {
    if (isTestRepoWatcherSetUp) {
        return;
    }

    isTestRepoWatcherSetUp = true;

    const testRepoDirFullPath = path.resolve(config.testRepoDir);

    const watcher = chokidar.watch(testRepoDirFullPath, {
        ignored: /(^|[\/\\])\../,
        ignoreInitial: true
    });

    async function reloadRepo(filePath: string, fileStat) {
        console.log('Detected update: ' + filePath);
        await parseTestRepo();
        console.log('The test repository was reloaded');
    }

    var debouncedReloadRepo = _.debounce(reloadRepo, 1000);

    // Watch test repo for changes and reload, as necessary
    watcher
        .on('add', (filePath, fileStat) => {
            debouncedReloadRepo(filePath, fileStat); })
        .on('change', (filePath, fileStat) => {
            debouncedReloadRepo(filePath, fileStat); })
        .on('unlink', (filePath, fileStat) => {
            debouncedReloadRepo(filePath, fileStat); });
}

export function setTestInfos(newTestInfos: TestInfo[]) {
    allTestInfos = newTestInfos;
}

export function validateTemplateDefinition(testDef: any): jsonSchema.ValidatorResult {
    var validator = new jsonSchema.Validator();

    let sessionTemplateSchema = {
        "id": "/TemplateDefinition",
        "type": "object",
        "properties": {
            "actorTags": {
                "type": "array"
            },
            "description": { "type": "string" },
            "sessionLabel": { "type": "string" },
            "maxIterations": { "type": "number" },
            "tests": {
                "type": "array"
            }
        },
        "required": [
            "tests"
        ]
    };

    return validator.validate(testDef, sessionTemplateSchema);
}

export function validateTestDefinition(testDef: any): jsonSchema.ValidatorResult {
    var validator = new jsonSchema.Validator();

    let testDefAction = {
        "id": "/TestDefAction",
        "type": "object",
        "properties": {
            "description": { "type": "string" },
            "action": { "type": "string" },
            "args": {
                "type": "object"
            }
        }
    };

    let testDefSegment = {
        "id": "/TestDefSegment",
        "type": "object",
        "properties": {
            "description": { "type": "string" },
            "index": { "type": "number" },
            "step": { "type": "number" },
            "segment": { "type": "number" },
            "actions": {
                "type": "array",
                // "required": true,
                "items": {
                    "type": "object" // TODO: Do proper validation here
                }
            }
        }
    };

    let testDefActor = {
        "id": "/TestDefActor",
        "type": "object",
        "properties": {
            "actorType": { "type": "string" },
            "description": { "type": "string" },
            "steps": {
                "type": "array",
            },
            "segments": {
                "type": "array"
            }
        }
    };

    let testDefSchema = {
        "id": "/TestDefinition",
        "type": "object",
        "properties": {
            "format": { "type": "string" },
            "description": { "type": "string" },
            "actors": {
                "type": "array"
            }
        }
    };

    validator.addSchema(testDefSegment, '/TestDefAction');
    validator.addSchema(testDefSegment, '/TestDefSegment');
    validator.addSchema(testDefActor, '/TestDefActor');

    return validator.validate(testDef, testDefSchema);
}
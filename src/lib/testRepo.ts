import * as _ from 'underscore';
import * as configLoader from '../lib/configLoader';
import * as crypto from 'crypto';
import { TestAssetName, TestInfo } from '../lib/types';
import * as fileWalker from './fileWalker';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as jsYaml from 'js-yaml';
import * as jsonSchema from 'jsonschema';
import * as path from 'path';
import { ScriptEngine } from './script-engine';
import * as thenify from 'thenify';

export let allTestInfos: TestInfo[] = [];

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

export function parseTestRepo() {
    const config = configLoader.getConfig();
    const testRepoDirFullPath = path.resolve(config.testRepoDir);

    if (!helpers.directoryExists(testRepoDirFullPath)) {
        throw new Error(helpers.format(
            'The test repo directory "{0}" doesn\'t exist. Please make sure the path is correctly specified in your config.yaml file.',
            testRepoDirFullPath
        ));
    }

    const testsDir = path.join(testRepoDirFullPath, 'tests');

    // Clear the existing array
    allTestInfos.length = 0;

    fileWalker.walkRecursive(testsDir, async function (parentDirName, fileName, fileStats) {
        if (fileStats.isFile) {
            let fileFullPath = path.join(parentDirName, fileName);

            try {
                if (path.extname(fileFullPath) === '.yaml') {
                    let fileData = await thenify(fs.readFile)(fileFullPath);
                    let testDefString = fileData.toString('utf8');
                    let testDef = jsYaml.safeLoad(testDefString);
                    let validationResult = validateTestDefinition(testDef);
                    if (validationResult.errors.length == 0) {
                        // TODO: Continue work here
                        // console.log(fileFullPath);
                        allTestInfos.push({
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
                        });
                    } else {
                        console.log(
                            helpers.format("Test definition file {0} failed validaton",
                                fileFullPath));
                        console.log(validationResult.errors);
                    }
                }
            } catch (err) {
                if (process.env.NODE_ENV != 'test') {
                    console.log(helpers.format('WARN: Failed to parse test definition file "{0}". {1}',
                        fileFullPath,
                        err.message));
                }
            }
        }
    });

    // Sort by test path and test name
    allTestInfos = _(allTestInfos).chain().sortBy(function (ti) {
        return ti.path;
    }).sortBy(function (ti) {
        return ti.name;
    }).value();
}

export function setTestInfos(newTestInfos: TestInfo[]) {
    allTestInfos = newTestInfos;
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

    return validator.validate(testDef, testDefSchema);;
}
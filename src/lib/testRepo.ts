import * as _ from 'underscore';
import * as configLoader from '../lib/configLoader';
import * as crypto from 'crypto';
import { TestAssetName, TestInfo, TestParam } from '../lib/types';
import * as fileWalker from './fileWalker';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as jsYaml from 'js-yaml';
import * as jsonSchema from 'jsonschema';
import * as path from 'path';

export let testInfos: TestInfo[] = [];

function extractTestParameters(testDefString: string): TestParam[] {
    return [{ "name": "parameter2", "value": "value2" }, { "name": "parameter1", "value": "value1" }];
}

function getAssetFullPath(assetName: TestAssetName): string {
    return assetName.path + "/" + assetName.name;
}

/** Add the actors and steps information to a set of TestInfo objects
 * that only contains the test names */
export function completeTestInfos(incompleteTestInfos: TestInfo[], completeTestInfos: TestInfo[]) {
    for (let incompleteTestInfo of incompleteTestInfos) {
        for (let completeTestInfo of completeTestInfos) {
            if (getAssetFullPath(incompleteTestInfo) === getAssetFullPath(completeTestInfo)) {
                incompleteTestInfo.actors = completeTestInfo.actors;
                incompleteTestInfo.steps = completeTestInfo.steps;
            }
        }
    }
}

export function parseTestRepo() {
    let config = configLoader.getConfig();
    let testRepoDirFullPath = path.resolve(config.testRepoDir);
    let testsDir = path.join(testRepoDirFullPath, 'tests');
    testInfos = [];

    fileWalker.walkRecursive(testsDir, function (parentDirName, fileName, fileStats) {
        if (fileStats.isFile) {
            let fileFullPath = path.join(parentDirName, fileName);

            try {
                if (path.extname(fileFullPath) === '.yaml') {
                    let fileData = fs.readFileSync(fileFullPath);
                    let testDefString = fileData.toString('utf8');
                    let testDef = jsYaml.safeLoad(testDefString);
                    let validationResult = validateTestDefinition(testDef);
                    if (validationResult.errors.length == 0) {
                        // TODO: Continue work here
                        // console.log(fileFullPath);
                        testInfos.push({
                            actors: _.unique(testDef.actors.map((a) => { return a.actorType; })) as string[],
                            hash: crypto.createHash('sha1').update(fileData).digest('hex'),
                            name: path.basename(fileFullPath, path.extname(fileFullPath)),
                            params: extractTestParameters(testDefString),
                            path: path.dirname(fileFullPath).substring(testsDir.length + 1).replace(/\\/g, '/'),
                            steps: _.flatten(testDef.actors.map(
                                (a) => { return a.steps.map((s) => { return s.step || s.index; }); }
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
    testInfos = _(testInfos).chain().sortBy(function (ti) {
        return ti.path;
    }).sortBy(function (ti) {
        return ti.name;
    }).value();
}

export function setTestInfos(newTestInfos: TestInfo[]) {
    testInfos = newTestInfos;
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

    let testDefStep = {
        "id": "/TestDefStep",
        "type": "object",
        "properties": {
            "description": { "type": "string" },
            "index": { "type": "number" },
            "step": { "type": "number" },
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
                // "required": true,
                "items": {
                    // "type": { "$ref": "/TestDefStep" }
                }
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
                "type": "array",
                // "required": true,
                "items": {
                    // "type": { "$ref": "/TestDefActor" }
                }
            }
        }
    };

    validator.addSchema(testDefStep, '/TestDefAction');
    validator.addSchema(testDefStep, '/TestDefStep');
    validator.addSchema(testDefActor, '/TestDefActor');

    return validator.validate(testDef, testDefSchema);;
}
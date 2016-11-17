import * as _ from 'underscore';
import * as configLoader from '../lib/configLoader';
import * as crypto from 'crypto';
import * as fileWalker from './fileWalker';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as jsYaml from 'js-yaml';
import * as jsonSchema from 'jsonschema';
import * as path from 'path';

/** Stores information about a test item (test definition, macro, etc. */
export interface ITestItemInfo {
    actors: string[],
    hash: string,
    name: string,
    path: string,
    steps: number[]
}

export let testInfos: ITestItemInfo[] = [];

export function parseTestRepo() {
    let config = configLoader.getConfig();
    let testRepoDirFullPath = path.resolve(path.join(config.testRepoLocation, config.testRepoDirName));
    let testsDir = path.join(testRepoDirFullPath, 'tests');

    testInfos = [];

    fileWalker.walkRecursive(testsDir, function (parentDirName, fileName, fileStats) {
        if (fileStats.isFile) {
            let fileFullPath = path.join(parentDirName, fileName);

            try {
                if (path.extname(fileFullPath) === '.yaml') {
                    let fileData = fs.readFileSync(fileFullPath);
                    let testDef = jsYaml.safeLoad(fileData.toString('utf8'));
                    let validationResult = validateTestDefinition(testDef);
                    if (validationResult.errors.length == 0) {
                        // TODO: Continue work here
                        // console.log(fileFullPath);
                        testInfos.push({
                            actors: testDef.actors.map((a) => { return a.actorType; }),
                            hash: crypto.createHash('sha1').update(fileData).digest('hex'),
                            name: path.basename(fileFullPath, path.extname(fileFullPath)),
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

export function setTestInfos(newTestInfos: ITestItemInfo[]) {
    testInfos = newTestInfos;
}

export function validateTestDefinition(testDef: any): jsonSchema.IJSONSchemaResult {
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
                "required": true,
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
            "actorType": { "type": "string", "required": true },
            "description": { "type": "string" },
            "steps": {
                "type": "array",
                "required": true,
                "items": {
                    "type": { "$ref": "/TestDefStep" }
                }
            }
        }
    };

    let testDefSchema = {
        "id": "/TestDefinition",
        "type": "object",
        "properties": {
            "format": { "type": "string", "required": true },
            "description": { "type": "string" },
            "actors": {
                "type": "array",
                "required": true,
                "items": {
                    "type": { "$ref": "/TestDefActor" }
                }
            }
        }
    };

    validator.addSchema(testDefStep, '/TestDefAction');
    validator.addSchema(testDefStep, '/TestDefStep');
    validator.addSchema(testDefActor, '/TestDefActor');

    return validator.validate(testDef, testDefSchema);;
}
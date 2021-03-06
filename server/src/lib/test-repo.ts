import * as _ from 'underscore';
import * as configLoader from '../lib/config-loader';
import * as chokidar from 'chokidar';
import * as crypto from 'crypto';
import { TestAssetName, TestInfo, TestSessionProperties, TestSessionTemplate } from '../lib/types';
import * as fileWalker from './file-walker';
import * as fs from 'fs';
import * as helpers from './helpers';
import * as jsYaml from 'js-yaml';
import * as jsonSchema from 'jsonschema';
import * as os from 'os';
import * as path from 'path';
import * as thenify from 'thenify';

let allTemplates: TestSessionTemplate[] = [];
let allTestInfos: TestInfo[] = [];
let isTestRepoWatcherSetUp = false;
const isWindows = (os.platform().startsWith('win'));

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

/** Returns true if a collection of test assets contains the specified
 * asset and false otherwise. */
export function containsAsset(testAssets: TestAssetName[], testAssetToFind: TestAssetName): boolean {
    for (const testAsset of testAssets) {
        let path1 = normalizePartialPath(testAsset.path);
        let path2 = normalizePartialPath(testAssetToFind.path);
        let name1 = normalizePartialPath(testAsset.name);
        let name2 = normalizePartialPath(testAssetToFind.name);

        if (isWindows) {
            path1 = path1.toLocaleLowerCase();
            path2 = path2.toLocaleLowerCase();
            name1 = name1.toLocaleLowerCase();
            name2 = name2.toLocaleLowerCase();
        }

        if ((path1 === path2) && (name1 === name2)) {
            return true;
        }
    }

    return false;
}

export function getAllTemplates(): TestSessionTemplate[] {
    return allTemplates;
}

export function getAllTestInfos(): TestInfo[] {
    return allTestInfos;
}

/** Computes a test asset partial path by concatenating the relative path
 * with the asset name (separated by "/"). */
function getAssetPartialPath(assetName: TestAssetName): string {
    const assetRelativePath = normalizePartialPath(assetName.path);
    const assetFileName = normalizePartialPath(assetName.name);

    if (!assetRelativePath) {
        return assetFileName;
    } else {
        return helpers.format('{0}/{1}',
            assetRelativePath,
            assetFileName);
    }
}

/** Reads and returns a test session template from cache. Returns null if the
 * template was not found. */
export function getSessionTemplate(templateName: TestAssetName): TestSessionTemplate {
    let normalizedNameToFind = normalizePartialPath(templateName.name);
    if (!normalizedNameToFind) {
        return null;
    }
    let normalizedPathToFind = normalizePartialPath(templateName.path);

    if (isWindows) {
        normalizedNameToFind = normalizedNameToFind.toLocaleLowerCase();
        normalizedPathToFind = normalizedPathToFind.toLocaleLowerCase();
    }

    for (let currentTemplate of allTemplates) {
        let normalizedName = normalizePartialPath(currentTemplate.name);
        let normalizedPath = normalizePartialPath(currentTemplate.path);

        if (isWindows) {
            normalizedName = normalizedName.toLocaleLowerCase();
            normalizedPath = normalizedPath.toLocaleLowerCase();
        }

        if ((normalizedName === normalizedNameToFind) && (normalizedPath === normalizedPathToFind)) {
            return currentTemplate;
        }
    }

    return null;
}

/** Returns all the tests from a collection whose tags conform to the
 * specified expression, for example "(tag1 || tag2) && tag3". */
export function getTestsByTagPredicate(allTests: TestInfo[], tagPredicate: string): TestInfo[] {
    const results: TestInfo[] = [];

    for (let testInfo of allTests) {
        const currentPredicate = tagPredicate.replace(/[\w\-+\[\].\/]+/g, function (match) {
            return hasTag(testInfo, match) ? 'true' : 'false';
        });

        try {
            if (eval(currentPredicate)) {
                results.push(testInfo);
            }
        } catch (err) {
            console.log(`ERROR: Failed to evaluate expression "${tagPredicate}" while selecting tests by tags. The error message was: ${err.message}. Please review the expression and correct it.`);
            break;
        }
    }

    return results;
}

/** Returns the TestInfo object corresponding to a TestAssetName. */
export function getTestInfo(selectionTestName: TestAssetName): TestInfo {
    for (let repoTestName of allTestInfos) {
        const selectionTestFullPath = getAssetPartialPath(selectionTestName);
        const repoTestFullPath = getAssetPartialPath(repoTestName);
        if (selectionTestFullPath === repoTestFullPath) {
            return {
                actors: repoTestName.actors,
                dataDriven: repoTestName.dataDriven,
                name: repoTestName.name,
                path: repoTestName.path,
                segments: repoTestName.segments,
                tags: repoTestName.tags
            };
        }
    }

    return null;
}

/** Returns the array of TestInfo objects corresponding to an array of
 *  TestAssetName objects. */
export function getTestInfos(selectionTestNames: TestAssetName[]): TestInfo[] {
    const resultTestInfos: TestInfo[] = [];

    for (let selectionTestName of selectionTestNames) {
        const testInfo = getTestInfo(selectionTestName);
        if (testInfo) {
            resultTestInfos.push(testInfo);
        }
    }

    return resultTestInfos;
}

export async function getTestsForTemplate(allTests: TestInfo[], template: TestSessionTemplate): Promise<TestAssetName[]> {
    if (!template) {
        return [];
    }

    let results: TestAssetName[] = template.tests || [];

    if (template.includeTestsWithTags) {
        results = mergeTestAssets(results, getTestsByTagPredicate(allTests, template.includeTestsWithTags));
    }

    if (template.includeTestsFromTemplates) {
        for (let currentTemplateName of template.includeTestsFromTemplates) {
            const currentTemplate = await getSessionTemplate(currentTemplateName);
            results = mergeTestAssets(results, await getTestsForTemplate(allTests, currentTemplate));
        }
    }

    // Exclude tests that are missing the name property
    results = results.filter(t => t.name);

    // Trim the ".yaml" extension from test name, if present
    results.forEach(function (testAsset) {
        testAsset.name = testAsset.name.replace(/\.yaml\s*$/i, '');
    });

    return results;
}

/** Returns true if a test contains the specified tag and false otherwise. */
export function hasTag(testInfo: TestInfo, requiredTag: string): boolean {
    let tagWasFound = false;
    for (let testTag of testInfo.tags || []) {
        if (testTag === requiredTag) {
            tagWasFound = true;
            break;
        }
    }

    return tagWasFound;
}

/** Returns the test assets that exist in the first collection but not in the second. */
export function excludeTestAssets(testAssets1: TestAssetName[], testAssets2: TestAssetName[]): TestAssetName[] {
    let resultingAssets: TestAssetName[] = [];

    for (let testAsset of testAssets1) {
        if (!containsAsset(testAssets2, testAsset)) {
            resultingAssets.push(testAsset);
        }
    }

    return resultingAssets;
}

/** Returns the test assets that exist in the first or second collection. Makes
 * sure to skip duplicates. */
export function mergeTestAssets(testAssets1: TestAssetName[], testAssets2: TestAssetName[]): TestAssetName[] {
    // Clone first collection
    let mergedAssets: TestAssetName[] = testAssets1.concat();

    for (let testAsset of testAssets2) {
        if (!containsAsset(testAssets1, testAsset)) {
            mergedAssets.push(testAsset);
        }
    }

    return mergedAssets;
}

/** Normalizes a partial path using path.normalize, but also replaces "\" with "/"
 * and trims any "\", "/", "." and space from the beginning and the end of the path.
 * The purpose is to make it possible to safely compare two partial paths. */
export function normalizePartialPath(relativePath) {
    const trimmedPath = helpers.trimChars(relativePath || '', '\\/\. ');
    if (!trimmedPath) {
        return '';
    } else {
        return path.normalize(trimmedPath)
            .replace(/[\\]/g, '/');
    }
}

export async function parseTestRepo(): Promise<void> {
    const config = configLoader.getConfig();

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
    const readFileAsync = thenify(fs.readFile);

    // Recursively browse the tests directory and extract test information
    if (helpers.directoryExists(testsDir)) {
        await fileWalker.walkRecursive(testsDir, async function (parentDirName, fileName, fileStats) {
            if (fileStats.isFile()) {
                const fileFullPath = path.join(parentDirName, fileName);

                try {
                    const extName = path.extname(fileFullPath).toLowerCase();

                    if (extName === '.yaml' || extName === '.yml') {
                        const fileData = await readFileAsync(fileFullPath);
                        const testDefString: string = fileData.toString('utf8');
                        if (testDefString.trim().length === 0) {
                            console.log(`Ignoring empty file ${fileFullPath}`);
                            return;
                        }
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
                                )).sort() as number[],
                                tags: testDef.tags || []
                            };
                            newTestInfos.push(testInfo);
                        } else {
                            console.log(
                                helpers.format("Test definition file {0} failed validation",
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
                    if (path.extname(fileFullPath).toLowerCase() === '.yaml') {
                        const fileData = await readFileAsync(fileFullPath);
                        const templateString = fileData.toString('utf8');
                        if (templateString.trim().length === 0) {
                            console.log(`Ignoring empty file ${fileFullPath}`);
                            return;
                        }
                        const template = jsYaml.safeLoad(templateString);
                        const validationResult = validateTemplateDefinition(template);
                        if (validationResult.errors.length == 0) {
                            const templateInfo: TestSessionTemplate = {
                                name: path.basename(fileFullPath, path.extname(fileFullPath)),
                                path: path.dirname(fileFullPath).substring(templatesDir.length + 1).replace(/\\/g, '/'),
                                ...template
                            };
                            newTemplateInfos.push(templateInfo);
                        } else {
                            console.log(
                                helpers.format("Session template file {0} failed validation",
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

    allTemplates = newTemplateInfos;
}

/** Sets the test template cache to the specified array. */
export function setAllTemplates(newTemplates: TestSessionTemplate[]) {
    allTemplates = newTemplates;
}

/** Sets the tests cache to the specified array. */
export function setAllTestInfos(newTests: TestInfo[]) {
    allTestInfos = newTests;
}

export function setupTestRepoWatcher() {
    const config = configLoader.getConfig();

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
            debouncedReloadRepo(filePath, fileStat);
        })
        .on('change', (filePath, fileStat) => {
            debouncedReloadRepo(filePath, fileStat);
        })
        .on('unlink', (filePath, fileStat) => {
            debouncedReloadRepo(filePath, fileStat);
        });
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
            "description": { "type": ["string", null] },
            "sessionLabel": { "type": ["string", null] },
            "maxIterations": { "type": ["number", null] },
            "tests": {
                "type": "array"
            }
        },
        "required": [
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
            "description": { "type": ["string", null] },
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
import * as assert from 'assert';
import * as dirs from '../../lib/dirs';
import * as configLoader from '../../lib/config-loader';
import * as testRepo from '../../lib/test-repo';
import * as path from 'path';
import { TestAssetName, TestInfo, TestSessionTemplate } from '../../lib/types';

describe('test-repo module', function () {
    before(function () {
        configLoader.loadConfig({
            testRepoDir: path.join(dirs.appRootDir(), 'src', 'test', 'repo')
        });
    });

    it('should parse test repo', async function () {
        await testRepo.parseTestRepo();
        assert(testRepo.getAllTestInfos().length > 0);
    });

    it('test-repo.containsAsset positive test', async function () {
        const asset1: TestAssetName = {
            name: 'Asset1',
            path: 'my/asset/path'
        };

        const asset2: TestAssetName = {
            name: 'Asset2',
            path: 'my/asset/path'
        };

        const assets: TestAssetName[] = [asset1, asset2];

        assert(testRepo.containsAsset(assets, asset1));
        assert(testRepo.containsAsset(assets, asset2));
    });

    it('test-repo.containsAsset negative test', async function () {
        const asset1: TestAssetName = {
            name: 'Asset1',
            path: 'my/asset/path'
        };

        const asset2: TestAssetName = {
            name: 'Asset2',
            path: 'my/asset/path'
        };

        const assets: TestAssetName[] = [asset1];

        assert(testRepo.containsAsset(assets, asset2) === false);
    });

    it('test-repo.containsTag', async function () {
        const test1 = {
            name: 'Test1',
            path: 'my/test/path',
            dataDriven: false,
            tags: []
        };

        const test2 = {
            name: 'Test2',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['tag1']
        };

        const test3 = {
            name: 'Test3',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['tag1', 'tag2']
        };

        assert(!testRepo.hasTag(test1, 'tag1'));
        assert(testRepo.hasTag(test2, 'tag1'));
        assert(testRepo.hasTag(test3, 'tag1'));
        assert(testRepo.hasTag(test3, 'tag2'));
    });

    it('test-repo.getTestsByTagPredicate', async function () {
        const testInfoCollection: TestInfo[] = [{
            name: 'Test1',
            path: 'my/test/path',
            dataDriven: false,
            tags: []
        }, {
            name: 'Test2',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1']
        }, {
            name: 'Test3',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag2']
        }, {
            name: 'Test4',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag2', 'Tag3']
        }, {
            name: 'Test5',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag3']
        }, {
            name: 'Test6',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['tag-with_dashes']
        }];

        const testsWithTag1 = testRepo.getTestsByTagPredicate(testInfoCollection, 'Tag1');
        assert(testsWithTag1.length === 4);
        assert(testsWithTag1[0].name === 'Test2');
        assert(testsWithTag1[3].name === 'Test5');

        const testsWithTag1Not2 = testRepo.getTestsByTagPredicate(testInfoCollection, 'Tag1 && !Tag2');
        assert(testsWithTag1Not2.length === 2);
        assert(testsWithTag1Not2[0].name === 'Test2');
        assert(testsWithTag1Not2[1].name === 'Test5');

        const testsWithDashes = testRepo.getTestsByTagPredicate(testInfoCollection, 'tag-with_dashes');
        assert(testsWithDashes.length === 1);
        assert(testsWithDashes[0].name === 'Test6');

        const testsWithParens = testRepo.getTestsByTagPredicate(testInfoCollection, '(Tag1 && Tag2) || (Tag1 && Tag3)');
        assert(testsWithParens.length === 3);
        assert(testsWithParens[0].name === 'Test3');
        assert(testsWithParens[2].name === 'Test5');
    });

    it('test-repo.getTestsForTemplate happy path', async function () {
        const allTests: TestInfo[] = [{
            name: 'Test1',
            path: 'my/test/path',
            dataDriven: false,
            tags: []
        }, {
            name: 'Test2',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1']
        }, {
            name: 'Test3',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag2']
        }, {
            name: 'Test4',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag2', 'Tag3']
        }, {
            name: 'Test5',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag2', 'Tag3']
        }, {
            name: 'Test6',
            path: 'my/test/path',
            dataDriven: false,
            tags: ['Tag1', 'Tag3']
        }];

        // Build and test template1
        const template1: TestSessionTemplate = {
            name: 'template1',
            path: 'my/template/path',
            tests: [],
            includeTestsWithTags: 'Tag1 && !Tag2'
        };

        const testsFromTemplate1 = await testRepo.getTestsForTemplate(allTests, template1);
        assert(testsFromTemplate1.length === 2);
        assert(testsFromTemplate1[0].name === 'Test2');
        assert(testsFromTemplate1[1].name === 'Test6');

        // Build and test template2
        const template2: TestSessionTemplate = {
            name: 'template2',
            path: 'my/template/path',
            tests: [],
            includeTestsWithTags: 'Tag2 && !Tag1'
        };

        const testsFromTemplate2 = await testRepo.getTestsForTemplate(allTests, template2);
        assert(testsFromTemplate2.length === 1);
        assert(testsFromTemplate2[0].name === 'Test4');

        testRepo.setAllTemplates([template1, template2]);

        // Build and test template3, made from template1 and template2
        const template3: TestSessionTemplate = {
            tests: [],
            includeTestsFromTemplates: [
                {
                    name: 'template1',
                    path: 'my/template/path'
                }, {
                    name: 'template2',
                    path: 'my/template/path'
                }
            ]
        };

        const testsFromTemplate3 = await testRepo.getTestsForTemplate(allTests, template3);
        assert(testsFromTemplate3.length === 3);
        assert(testsFromTemplate3[0].name === 'Test2');
        assert(testsFromTemplate3[1].name === 'Test6');
        assert(testsFromTemplate3[2].name === 'Test4');
    });

    it('test-repo.getTestsForTemplate with null template', async function () {
        const allTests: TestInfo[] = [{
            name: 'Test1',
            path: 'my/test/path',
            dataDriven: false,
            tags: []
        }];

        // Build and test template1
        const allTemplates: TestSessionTemplate[] = [{
            name: 'template1',
            path: 'my/template/path',
            tests: []
        }];

        testRepo.setAllTemplates(allTemplates);
        testRepo.setAllTestInfos(allTests);

        const testsFromTemplate = await testRepo.getTestsForTemplate(allTests, null);
        assert(testsFromTemplate.length === 0);
    });

    it('test-repo.excludeTestAssets', async function () {
        const asset1: TestAssetName = {
            name: 'Asset1',
            path: 'my/asset/path'
        };

        const asset2: TestAssetName = {
            name: 'Asset2',
            path: 'my/asset/path'
        };

        const asset3: TestAssetName = {
            name: 'Asset3',
            path: 'my/asset/path'
        };

        const assets1: TestAssetName[] = [asset1, asset2, asset3];
        const assets2: TestAssetName[] = [asset1, asset3];
    });

    it('test-repo.mergeTestAssets', async function () {
        const asset1: TestAssetName = {
            name: 'Asset1',
            path: 'my/asset/path'
        };

        const asset2: TestAssetName = {
            name: 'Asset2',
            path: 'my/asset/path'
        };

        const asset3: TestAssetName = {
            name: 'Asset3',
            path: 'my/asset/path'
        };

        const assets1: TestAssetName[] = [asset1, asset2];
        const assets2: TestAssetName[] = [asset2, asset3];

        const mergedAssets = testRepo.mergeTestAssets(assets1, assets2);

        assert(mergedAssets.length === 3);
    });

    it('test-repo.normalizeRelativePath', async function () {
        const path1 = testRepo.normalizePartialPath('');
        const path2 = testRepo.normalizePartialPath(null);
        const path3 = testRepo.normalizePartialPath(' dir1/dir2 ');
        const path4 = testRepo.normalizePartialPath(' dir1\\dir2/ ');
        const path5 = testRepo.normalizePartialPath(' /dir1/dir2\\dir3/dir4 ');

        assert.strictEqual(path1, '');
        assert.strictEqual(path2, '');
        assert.strictEqual(path3, 'dir1/dir2');
        assert.strictEqual(path4, 'dir1/dir2');
        assert.strictEqual(path5, 'dir1/dir2/dir3/dir4');
    });
});
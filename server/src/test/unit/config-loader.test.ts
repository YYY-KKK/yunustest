import * as assert from 'assert';
import * as fs from 'fs';
import * as configLoader  from '../../lib/config-loader';
import * as path from 'path';
import * as tempModule from 'temp';
import * as yaml from 'js-yaml';

let temp = tempModule.track(true);

describe('config-loader module', function () {
    after(function() {
        temp.cleanupSync();
    });

    it('should load config from sample file (relative path)', function () {
        configLoader.loadConfig('server.sample.yaml');
        const config = configLoader.getConfig();

        const configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'server.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });

    it('should load config from sample file (absolute path)', function () {
        const configAbsolutePath = path.resolve('server.sample.yaml');
        configLoader.loadConfig(configAbsolutePath);
        const config = configLoader.getConfig();

        const configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'server.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });

    it('should throw when loading config from missing file', function () {
        assert.throws(function () {
            const config = configLoader.loadConfig('config-missing.yaml');
        });
    });

    it('should throw when loading config from a corrupted file', function () {
        assert.throws(function () {
            var tempFileInfo = temp.openSync('test-sync-temp-file');
            fs.writeSync(tempFileInfo.fd, 'Some invalid YAML: [}');

            var config = configLoader.loadConfig(tempFileInfo.path);
        });
    });

    it('should give a warning when loading a potentially incorrect parameter', function () {
        var tempFileInfo = temp.openSync('test-sync-temp-file');
        fs.writeSync(tempFileInfo.fd, JSON.stringify({
            testRepoDir: path.join('.', 'test-defs'),
            someWrongParameterName: "some value"
        }));

        var config = configLoader.loadConfig(tempFileInfo.path);

        // No assertion possible, since this doesn't cause an exception, but only logs a
        // warning at the console. We're only running this for test coverage reporting.
    });

    it('should load config from a JS object', function () {
        configLoader.loadConfig({
            someParameter: "some value"
        });
        var config = configLoader.getConfig();

        // assert.equal(config.testRepoDir, path.join('.', 'test-defs'));
        assert.equal((config as any).someParameter, 'some value');
    });

    it('should return current config', function () {
        configLoader.loadConfig('server.sample.yaml');
        var config = configLoader.getConfig();

        var configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'server.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });
});
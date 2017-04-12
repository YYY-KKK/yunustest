var assert = require('assert');
var fs = require('fs');
var configLoader = require('../../lib/configLoader');
var path = require('path');
var temp = require('temp').track(true);
var yaml = require('js-yaml');

describe('Config loader', function () {
    after(function() {
        temp.cleanupSync();
    });

    it('should load config from sample file (relative path)', function () {
        configLoader.loadConfig('config.sample.yaml');
        var config = configLoader.getConfig();

        var configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'config.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });

    it('should load config from sample file (absolute path)', function () {
        var configAbsoulutePath = path.resolve('config.sample.yaml');
        configLoader.loadConfig(configAbsoulutePath);
        var config = configLoader.getConfig();

        var configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'config.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });

    it('should throw when loading config from missing file', function () {
        assert.throws(function () {
            var config = configLoader.loadConfig('config-missing.yaml');
        });
    });

    it('should throw when loading config from a corrupted file', function () {
        assert.throws(function () {
            var tempFileInfo = temp.openSync('test-sync-temp-file');
            fs.write(tempFileInfo.fd, 'Some invalid YAML: [}');

            var config = configLoader.loadConfig(tempFileInfo.path);
        });
    });

    it('should give a warning when loading a potentially incorrect parameter', function () {
        var tempFileInfo = temp.openSync('test-sync-temp-file');
        fs.write(tempFileInfo.fd, JSON.stringify({
            testRepoDir: path.join('.', 'test-defs'),
            someWrongParameterName: "some value"
        }));

        var config = configLoader.loadConfig(tempFileInfo.path);

        // No assertion possible, since this doesn't cause an exception, but only logs a
        // warning at the console. We're only running this test to ensure full coverage.
    });

    it('should load config from a JS object', function () {
        configLoader.loadConfig({
            someParameter: "some value"
        });
        var config = configLoader.getConfig();

        assert.equal(config.testRepoDir, path.join('.', 'test-defs'));
        assert.equal(config.someParameter, 'some value');
    });

    it('should return current config', function () {
        configLoader.loadConfig('config.sample.yaml');
        var config = configLoader.getConfig();

        var configFromFile = yaml.safeLoad(fs.readFileSync(path.join('.', 'config.sample.yaml'), 'utf8'));
        assert.equal(config.testRepoDir, configFromFile.testRepoDir);
    });
});
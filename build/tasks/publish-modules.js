const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');
const yargs = require('yargs');

helpers.logTitle('Publishing Node.js modules...');

if (yargs.argv.registry) {
    console.log(`Publishing packages to ${yargs.argv.registry}...`);

    let execResult;
    const npmTag = yargs.argv.tag ? yargs.argv.tag.trim() : 'beta';
    let cmdLine = `npm publish --registry ${yargs.argv.registry} --tag=${npmTag}`;

    console.log(`Publishing module opentest-actor...`);
    shelljs.cd(path.join(rootDir, 'dist', 'module-opentest-actor'));
    execResult = shelljs.exec(cmdLine);
    if (execResult.code != 0) {
        throw new Error('Failed to publish module opentest-actor.');
    }

    console.log(`Publishing module opentest-server...`);
    shelljs.cd(path.join(rootDir, 'dist', 'module-opentest-server'));
    execResult = shelljs.exec(cmdLine);
    if (execResult.code != 0) {
        throw new Error('Failed to publish module opentest-server.');
    }

    console.log(`Publishing module opentest...`);
    shelljs.cd(path.join(rootDir, 'dist', 'module-opentest'));
    execResult = shelljs.exec(cmdLine);
    if (execResult.code != 0) {
        throw new Error('Failed to publish module opentest.');
    }
} else {
    throw new Error('Package registry URL was not specified. Use the "--registry" argument to provide the URL.');
}
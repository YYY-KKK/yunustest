const config = require('../../lib/config-loader.js').config;
const helpers = require('../../lib/helpers.js');
const path = require('path');
const rootDir = require('../../lib/root-dir.js');
const shelljs = require('shelljs');
const yargs = require('yargs');

const newVersion = yargs.argv._[0];

console.log(`Updating opentest-server module version to ${newVersion}...`);
process.chdir(path.join(rootDir, 'server'));
shelljs.exec(`npm version ${newVersion}`);

console.log(`Updating opentest-actor module version to ${newVersion}...`);
process.chdir(path.join(rootDir, 'build', 'module-opentest-actor'));
shelljs.exec(`npm version ${newVersion}`);

console.log(`Updating opentest module version to ${newVersion}...`);
process.chdir(path.join(rootDir, 'build', 'module-opentest'));
shelljs.exec(`npm version ${newVersion}`);
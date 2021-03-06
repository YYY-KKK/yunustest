const config = require('../lib/config-loader.js').config;
const fs = require('fs');
const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');
const yargs = require('yargs');

const newVersion = yargs.argv._[0];

console.log(`Updating master module version to ${newVersion}...`);
process.chdir(path.join(rootDir));
shelljs.exec(`npm --no-git-tag-version version ${newVersion} --allow-same-version`);

console.log(`Updating opentest-server module version to ${newVersion}...`);
process.chdir(path.join(rootDir, 'server'));
shelljs.exec(`npm --no-git-tag-version version ${newVersion} --allow-same-version`);

console.log(`Updating opentest-actor module version to ${newVersion}...`);
process.chdir(path.join(rootDir, 'build', 'module-opentest-actor'));
shelljs.exec(`npm --no-git-tag-version version ${newVersion} --allow-same-version`);

console.log(`Updating opentest module version to ${newVersion}...`);
const openTestModuleDir = path.join(rootDir, 'build', 'module-opentest');
const packageJsonFile = path.join(openTestModuleDir, 'package.json');
process.chdir(openTestModuleDir);
shelljs.exec(`npm --no-git-tag-version version ${newVersion} --allow-same-version`);
let packageJson = fs.readFileSync(packageJsonFile, 'utf8');
// Replace opentest-actor dependency version
packageJson = packageJson.replace(
    /(.*"dependencies"[\s\S]*?"opentest-actor": ")(\d+\.\d+\.\d+)(",[\s\S]*?})/,
    `$1${newVersion}$3`);
// Replace opentest-server dependency version
packageJson = packageJson.replace(
    /(.*"dependencies"[\s\S]*?"opentest-server": ")(\d+\.\d+\.\d+)(",[\s\S]*?})/,
    `$1${newVersion}$3`);
fs.writeFileSync(packageJsonFile, packageJson);
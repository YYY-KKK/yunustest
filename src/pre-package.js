const config = require('./config-loader.js').config;
const path = require('path');
const rootDir = require('./root-dir.js');
const shelljs = require('shelljs');
const yargs = require('yargs');

const serverPackageDir = path.join(rootDir, 'package', 'opentest-server');
const actorPackageDir = path.join(rootDir, 'package', 'opentest-actor');
const actorRepoDir = path.join(rootDir, 'repos', 'opentest-actor');

if (yargs.argv.clean) {
    console.log("Cleaning up package dir...");
    shelljs.rm('-rf', path.join(rootDir, 'package'));
}
shelljs.mkdir('-p', path.join(rootDir, 'package'));

// Copy actor files
console.log("Copying actor files to package dir...");
shelljs.rm('-rf', actorPackageDir);
shelljs.mkdir('-p', actorPackageDir);
shelljs.cp(
    path.join(actorRepoDir, 'target', 'opentest-actor-0.0.1.jar'),
    actorPackageDir);
shelljs.cp(
    '-r',
    path.join(actorRepoDir, 'target', 'dependency-jars'),
    actorPackageDir);
shelljs.cp(
    path.join(actorRepoDir, 'target', 'classes', 'actor.sample.yaml'),
    path.join(actorPackageDir, 'actor.yaml'));
shelljs.cp(
    path.join(actorRepoDir, 'target', 'classes', 'run.bat'),
    actorPackageDir);

const serverRepoDir = path.join('repos', 'opentest-server');

// Copy server files
console.log("Copying server files to package dir...");
shelljs.rm('-rf', serverPackageDir);
shelljs.mkdir('-p', serverPackageDir);
shelljs.cp(
    '-r',
    path.join(serverRepoDir, 'build'),
    serverPackageDir);
shelljs.cp(
    path.join(serverRepoDir, 'package.json'),
    serverPackageDir);
shelljs.cp(
    path.join(serverRepoDir, 'package-lock.json'),
    serverPackageDir);
shelljs.cp(
    path.join(serverRepoDir, 'build-info.json'),
    serverPackageDir);
shelljs.cp(
    path.join(serverRepoDir, 'server.sample.yaml'),
    path.join(serverPackageDir, 'server.yaml'));

// Copy Node files
console.log("Copying Node files to package dir...");
shelljs.cp(
    path.join(rootDir, 'src', 'package', 'package.json'),
    path.join(rootDir, 'package'));
shelljs.cp(
    path.join(rootDir, 'src', 'package', 'package-lock.json'),
    path.join(rootDir, 'package'));
shelljs.cp(
    path.join(rootDir, 'src', 'package', 'opentest.js'),
    path.join(rootDir, 'package'));
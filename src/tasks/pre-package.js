const config = require('../lib/config-loader.js').config;
const fs = require('fs');
const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');

helpers.logTitle('Copying final deliverables to the package directories...');

prepareServerModuleFiles();
prepareActorModuleFiles();
prepareOpentestModuleFiles();

function prepareActorModuleFiles() {
    const actorRepoDir = path.join(rootDir, 'repos', config.repos.actor.repoDirName);
    const actorPackageSourceDir = path.join(rootDir, 'src', 'package-opentest-actor');
    const actorPackageDir = path.join(rootDir, 'package-opentest-actor');

    console.log('Cleaning-up actor package dir...');
    shelljs.rm('-rf', actorPackageDir);
    shelljs.mkdir('-p', actorPackageDir);

    console.log('Copying actor files to package dir...');

    shelljs.cp(
        '-r',
        path.join(actorRepoDir, 'target', 'dependency-jars'),
        path.join(actorPackageDir, 'jars'));
    shelljs.cp(
        path.join(actorRepoDir, 'target', 'classes', 'actor.sample.yaml'),
        path.join(actorPackageDir, 'actor.yaml'));
    shelljs.cp(
        path.join(actorRepoDir, 'target', 'classes', 'run.bat'),
        actorPackageDir);
    shelljs.cp(
        '-r',
        path.join(actorPackageSourceDir, 'bin'),
        actorPackageDir);
    shelljs.cp(
        path.join(actorPackageSourceDir, 'index.js'),
        actorPackageDir);
    shelljs.cp(
        path.join(actorPackageSourceDir, 'package.json'),
        actorPackageDir);
    shelljs.cp(
        path.join(actorPackageSourceDir, 'package-lock.json'),
        actorPackageDir);
}

function prepareOpentestModuleFiles() {
    const opentestPackageSourceDir = path.join(rootDir, 'src', 'package-opentest');
    const opentestPackageDir = path.join(rootDir, 'package-opentest');

    console.log('Cleaning-up opentest package dir...');
    shelljs.rm('-rf', opentestPackageDir);
    shelljs.mkdir('-p', opentestPackageDir);

    console.log('Copying opentest module files to package dir...');
    shelljs.cp(
        '-r',
        path.join(opentestPackageSourceDir, 'test-repo'),
        opentestPackageDir);
    shelljs.cp(
        path.join(opentestPackageSourceDir, 'package.json'),
        opentestPackageDir);
    shelljs.cp(
        path.join(opentestPackageSourceDir, 'package-lock.json'),
        opentestPackageDir);
    shelljs.cp(
        path.join(opentestPackageSourceDir, 'opentest.js'),
        opentestPackageDir);
}

function prepareServerModuleFiles() {
    const serverRepoDir = path.join('repos', config.repos.server.repoDirName);
    const serverPackageDir = path.join(rootDir, 'package-opentest-server');

    console.log('Cleaning-up server package dir...');
    shelljs.rm('-rf', serverPackageDir);
    shelljs.mkdir('-p', serverPackageDir);

    console.log('Copying server files to package dir...');
    shelljs.cp(
        '-r',
        path.join(serverRepoDir, 'bin'),
        serverPackageDir);
    shelljs.cp(
        '-r',
        path.join(serverRepoDir, 'dist'),
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
        path.join(serverRepoDir, 'index.js'),
        serverPackageDir);
    shelljs.cp(
        path.join(serverRepoDir, 'server.sample.yaml'),
        path.join(serverPackageDir, 'server.yaml'));

    // Remove "devDependencies" and "scripts" sections from package.json
    let packageJson = fs.readFileSync(path.join(serverRepoDir, 'package.json')).toString('utf8');
    packageJson = packageJson.replace(/,[\s\t\r\n]*"devDependencies":[\s\S]*?},?[\s\S]*?[\r\n]*/m, '');
    packageJson = packageJson.replace(/^\s*"scripts":[\s\S]*?},?[\s\S]*?[\r\n]*/m, '');
    fs.writeFileSync(path.join(serverPackageDir, 'package.json'), packageJson);
}
const config = require('../lib/config-loader.js').config;
const fs = require('fs');
const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');

helpers.logTitle('Copying final deliverables to module directories...');

prepareServerModuleFiles();
prepareActorModuleFiles();
prepareOpentestModuleFiles();

function prepareActorModuleFiles() {
    const actorProjectDir = config.actor && config.actor.projectDir ?
        path.join(rootDir, config.actor.projectDir.replace('/', path.sep)) :
        path.join(rootDir, 'actor', 'actor');
    const actorModuleSourceDir = path.join(rootDir, 'build', 'module-opentest-actor');
    const actorModuleDir = path.join(rootDir, 'dist', 'module-opentest-actor');

    console.log('Cleaning-up actor module dir...');
    shelljs.rm('-rf', actorModuleDir);
    shelljs.mkdir('-p', actorModuleDir);

    console.log('Copying actor files to module dir...');

    shelljs.cp(
        '-r',
        path.join(actorProjectDir, 'target', 'dependency-jars'),
        path.join(actorModuleDir, 'jars'));
    shelljs.cp(
        path.join(actorProjectDir, 'target', 'classes', 'actor.sample.yaml'),
        path.join(actorModuleDir, 'actor.yaml'));
    shelljs.cp(
        path.join(actorProjectDir, 'target', 'classes', 'run.bat'),
        actorModuleDir);
    shelljs.cp(
        '-r',
        path.join(actorModuleSourceDir, 'bin'),
        actorModuleDir);
    shelljs.cp(
        path.join(actorModuleSourceDir, 'index.js'),
        actorModuleDir);
    shelljs.cp(
        path.join(actorModuleSourceDir, 'package.json'),
        actorModuleDir);
    shelljs.cp(
        path.join(actorModuleSourceDir, 'package-lock.json'),
        actorModuleDir);
    shelljs.cp(
        path.join(actorModuleSourceDir, 'README.md'),
        actorModuleDir);
}

function prepareOpentestModuleFiles() {
    const opentestModuleSourceDir = path.join(rootDir, 'build', 'module-opentest');
    const opentestModuleDir = path.join(rootDir, 'dist', 'module-opentest');

    console.log('Cleaning-up opentest module dir...');
    shelljs.rm('-rf', opentestModuleDir);
    shelljs.mkdir('-p', opentestModuleDir);

    console.log('Copying opentest module files to module dir...');
    shelljs.cp(
        '-r',
        path.join(opentestModuleSourceDir, 'test-repo'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'package.json'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'package-lock.json'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'opentest.js'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'session.js'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'helpers.js'),
        opentestModuleDir);
    shelljs.cp(
        path.join(opentestModuleSourceDir, 'README.md'),
        opentestModuleDir);
}

function prepareServerModuleFiles() {
    const serverProjectDir = path.join(rootDir, 'server');
    const serverModuleDir = path.join(rootDir, 'dist', 'module-opentest-server');

    console.log('Cleaning-up server module dir...');
    shelljs.rm('-rf', serverModuleDir);
    shelljs.mkdir('-p', serverModuleDir);

    console.log('Copying server files to module dir...');
    shelljs.cp(
        '-r',
        path.join(serverProjectDir, 'bin'),
        serverModuleDir);
    shelljs.cp(
        '-r',
        path.join(serverProjectDir, 'dist'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'package.json'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'package-lock.json'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'build-info.json'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'index.js'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'README.md'),
        serverModuleDir);
    shelljs.cp(
        path.join(serverProjectDir, 'server.sample.yaml'),
        path.join(serverModuleDir, 'server.yaml'));

    // Remove "devDependencies" and "scripts" sections from package.json
    let packageJson = fs.readFileSync(path.join(serverProjectDir, 'package.json')).toString('utf8');
    packageJson = packageJson.replace(/,[\s\t\r\n]*"devDependencies":[\s\S]*?},?[\s\S]*?[\r\n]*/m, '');
    packageJson = packageJson.replace(/^\s*"scripts":[\s\S]*?},?[\s\S]*?[\r\n]*/m, '');
    fs.writeFileSync(path.join(serverModuleDir, 'package.json'), packageJson);
}
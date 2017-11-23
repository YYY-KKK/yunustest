const config = require('./config-loader.js').config;
const helpers = require('./helpers.js');
const path = require('path');
const rootDir = require('./root-dir.js');
const shelljs = require('shelljs');

const actorPackageDir = path.join(rootDir, 'package', config.repos.actor.repoDirName);
const actorRepoDir = path.join(rootDir, 'repos', config.repos.actor.repoDirName);

helpers.logTitle('Copying final deliverables to the package directory...');

console.log('Cleaning up package dir...');
shelljs.rm('-rf', path.join(rootDir, 'package'));
shelljs.mkdir('-p', path.join(rootDir, 'package'));

// Copy actor files
console.log('Copying actor files to package dir...');
shelljs.rm('-rf', actorPackageDir);
shelljs.mkdir('-p', actorPackageDir);
const actorJar = findJarFile(
    path.join(actorRepoDir, 'target'),
    config.repos.actor.jarArtifactId);
shelljs.cp(
    actorJar,
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

const serverRepoDir = path.join('repos', config.repos.server.repoDirName);
const serverPackageDir = path.join(rootDir, 'package', config.repos.server.repoDirName);

// Copy server files
console.log('Copying server files to package dir...');
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
console.log('Copying Node files to package dir...');
shelljs.cp(
    path.join(rootDir, 'src', 'package', 'package.json'),
    path.join(rootDir, 'package'));
shelljs.cp(
    path.join(rootDir, 'src', 'package', 'package-lock.json'),
    path.join(rootDir, 'package'));
shelljs.cp(
    path.join(rootDir, 'src', 'package', '*.js'),
    path.join(rootDir, 'package'));

const sampleRepoDirName = 'sample-repo';
const sampleRepoDir = path.join(rootDir, 'src', 'package', sampleRepoDirName);
const packageDir = path.join(rootDir, 'package');

// Copy sample test repo files
console.log('Copying sample test repo files to package dir...');
shelljs.rm('-rf', path.join(packageDir, sampleRepoDirName));
shelljs.mkdir('-p', serverPackageDir);
shelljs.cp(
    '-r',
    sampleRepoDir,
    packageDir);

/** Finds and returns the full path of a JAR file given a path to
 * search in and the JAR artifact ID */
function findJarFile(dirPath, jarArtifactId) {
    const allJars = shelljs.ls(path.join(dirPath, jarArtifactId + "*.jar"));
    // Exclude tests JAR and return the remaining file
    return allJars.filter((file) => !file.endsWith("-tests.jar"))[0];
}
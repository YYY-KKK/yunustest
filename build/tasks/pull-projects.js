const config = require('../lib/config-loader.js').config;
const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');

helpers.logTitle('Cloning projects...');

if (config.customProjects && config.customProjects.length) {
    config.customProjects.forEach(project => {
        cloneRepo(project);
    });
}

console.log('Done cloning projects');

function cloneRepo(project) {
    console.log(`Processing project ${project.dirName}...`);

    const customProjectsDir = path.join(rootDir, 'custom');
    shelljs.mkdir('-p', customProjectsDir);
    shelljs.cd(customProjectsDir);

    console.log(`Deleting ${project.dirName}...`);
    shelljs.rm('-rf', path.join(customProjectsDir, project.dirName));

    console.log(`Cloning ${project.dirName}...`);
    let returnVal;
    returnVal = shelljs.exec(`git clone --depth 1 ${project.repoUrl} ${project.dirName}`);
    if (returnVal.code != 0) {
        throw new Error('Failed cloning project ' + project.dirName + '.\n' + returnVal.stderr);
    }

    const gitRef = project.gitRef || 'master';
    shelljs.cd(path.join(customProjectsDir, project.dirName));
    returnVal = shelljs.exec(`git checkout ${gitRef}`);
    if (returnVal.code != 0) {
        throw new Error(`Failed checking out branch ${gitRef}.\n${returnVal.stderr}`);
    }
}
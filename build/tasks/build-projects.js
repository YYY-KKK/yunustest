const config = require('../lib/config-loader.js').config;
const helpers = require('../lib/helpers.js');
const path = require('path');
const rootDir = require('../lib/root-dir.js');
const shelljs = require('shelljs');

buildProject({
    name: 'opentest-server',
    path: 'server',
    type: 'node'
});

buildProject({
    name: 'opentest-base',
    path: path.join('actor', 'base'),
    type: 'maven'
});

buildProject({
    name: 'opentest-appium',
    path: path.join('actor', 'appium'),
    type: 'maven'
});

buildProject({
    name: 'opentest-selenium',
    path: path.join('actor', 'selenium'),
    type: 'maven'
});

buildProject({
    name: 'opentest-actor',
    path: path.join('actor', 'actor'),
    type: 'maven'
});

if (config.customProjects && config.customProjects.length) {
    config.customProjects.forEach(project => {
        buildProject({
            name: project.dirName,
            path: path.join('custom', project.dirName),
            type: 'maven'
        });
    });
}

console.log('\nAll projects were built successfully!\n');

function buildProject(project) {
    helpers.logTitle(`Building project ${project.name}...`);

    shelljs.cd(path.join(rootDir, project.path));

    let returnVal;

    if (project.type === 'maven') {
        returnVal = shelljs.exec('mvn clean install');
        if (returnVal.code != 0) {
            throw new Error(`Failed building Maven project ${project.name}.\n ${returnVal.stderr}`);
        }
    } else if (project.type === 'node') {
        console.log(`Installing dependencies for ${project.name}...`);
        returnVal = shelljs.exec('npm install');
        if (returnVal.code != 0) {
            throw new Error(`Failed installing dependencies for Node project ${project.name}.\n ${returnVal.stderr}`);
        }

        console.log(`Building ${project.name}...`);
        returnVal = shelljs.exec('npm run build');
        if (returnVal.code != 0) {
            throw new Error(`Failed building Node project ${project.name}.\n ${returnVal.stderr}`);
        }
    } else {
        throw new Error(`Unknown project type: ${project.type}`);
    }
}
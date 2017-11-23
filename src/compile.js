const config = require('./config-loader.js').config;
const helpers = require('./helpers.js');
const path = require('path');
const shelljs = require('shelljs');

const rootDir = path.resolve();
const reposDir = path.join(rootDir, 'repos');

// Compile server
buildRepo(config.repos.server, 'node');

// Compile base
buildRepo(config.repos.base, 'java');


//Compile plugins
for (let pluginRepo of config.repos.plugins) {
    buildRepo(pluginRepo, 'java');
}

// Compile actor
buildRepo(config.repos.actor, 'java');

function buildRepo(repo, projectType) {
    helpers.logTitle(helpers.format('Building project {0}...', repo.repoDirName));
    process.chdir(path.join(reposDir, repo.repoDirName));
    let returnVal;

    if (projectType === 'java') {
        returnVal = shelljs.exec('mvn clean install');
        if (returnVal.code != 0) {
            throw new Error(`Failed building Java project ${repo.repoDirName}.\n ${returnVal.stderr}`);
        }
    } else if (projectType === 'node') {
        // This command can help avoid a bug with npm on Windows
        // https://github.com/npm/npm/issues/17671
        console.log('Running "npm cache verify"');
        shelljs.exec('npm cache verify');

        console.log(`Installing dependencies for ${repo.repoDirName}...`);
        returnVal = shelljs.exec('npm install');
        if (returnVal.code != 0) {
            throw new Error(`Failed installing dependencies for Node project ${repo.repoDirName}.\n ${returnVal.stderr}`);
        }

        returnVal = shelljs.exec('npm run build');
        if (returnVal.code != 0) {
            throw new Error(`Failed building Node project ${repo.repoDirName}.\n ${returnVal.stderr}`);
        }
    } else {
        throw new Error(`Unknown project type: ${projectType}`);
    }
}
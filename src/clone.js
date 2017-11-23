const config = require('./config-loader.js').config;
const helpers = require('./helpers.js');
const path = require('path');
const rootDir = require('./root-dir.js');
const shelljs = require('shelljs');

const reposDir = path.join(rootDir, 'repos');

helpers.logTitle('Cloning projects...');

// Clone server
cloneRepo(config.repos.server);

// Clone base
cloneRepo(config.repos.base);


//Clone plugins
for (let pluginRepo of config.repos.plugins) {
    cloneRepo(pluginRepo);
}

// Clone actor
cloneRepo(config.repos.actor);

function cloneRepo(repo) {
    console.log(`Processing project ${repo.repoDirName}...`);
    const gitRef = repo.gitRef || config.repos.common.gitRef;

    shelljs.mkdir('-p', reposDir);
    process.chdir(reposDir);

    console.log(`Deleting ${repo.repoDirName}...`);
    shelljs.rm('-rf', path.join(reposDir, repo.repoDirName));

    console.log(`Cloning ${repo.repoDirName}...`);
    let returnVal;
    returnVal = shelljs.exec('git clone ' + repo.repoUrl + ' ' + repo.repoDirName);
    if (returnVal.code != 0) {
        throw new Error('Failed cloning project ' + repo.repoDirName + '.\n' + returnVal.stderr);
    }
    process.chdir(path.join(reposDir, repo.repoDirName));
    returnVal = shelljs.exec('git checkout ' + gitRef);
    if (returnVal.code != 0) {
        throw new Error('Failed checking out branch ' + gitRef + '.\n' + returnVal.stderr);
    }
}
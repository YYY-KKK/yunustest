const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

// If config file is missing, use default config
const configFile = path.normalize(path.join(__dirname, '..', 'config.json'));
const defaultConfigFile = path.normalize(path.join(__dirname, '..', 'config.default.json'));
if (!fs.existsSync(configFile) && fs.existsSync(defaultConfigFile)) {
    shelljs.cp(defaultConfigFile, configFile);    
}

module.exports.config = require(path.join('..', 'config.json'));

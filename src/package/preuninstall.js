const shelljs = require('shelljs');

console.log("This might take a couple of minutes. Please be patient.");
shelljs.exec('npm uninstall opentest-server -g');
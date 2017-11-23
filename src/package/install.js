const path = require('path');
const shelljs = require('shelljs');

shelljs.cd(path.join(__dirname, 'opentest-server'));

console.log('Verifying npm cache...');
shelljs.exec('npm cache verify');

console.log('\nInstalling Node dependency modules...');
var isWindows = process.platform.toLocaleLowerCase().indexOf("win") >= 0;
let npmInstallCommand;
if (isWindows) {
    // We are using --no-optional to try avoiding the fsevents on Windows
    // issue (https://github.com/npm/npm/issues/17671)
    npmInstallCommand = 'npm install --production --no-optional';
} else {
    npmInstallCommand = 'npm install --production';
}
console.log(`\nRunning "${npmInstallCommand}"...`);
shelljs.exec(npmInstallCommand);
console.log('Done installing dependencies');
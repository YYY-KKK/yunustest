const path = require('path');
const rootDir = require('./root-dir.js');
const shelljs = require('shelljs');

const srcDir = path.join(rootDir, 'src');

shelljs.cp(
    path.join(srcDir, 'package', 'package.json'),
    path.join(rootDir, 'package'));

shelljs.cp(
    path.join(srcDir, 'package', 'package-lock.json'),
    path.join(rootDir, 'package'));

// Create npm package
shelljs.exec('npm pack package/');
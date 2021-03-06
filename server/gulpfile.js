const childProcess = require('child_process');
const fs = require('fs');
const gulp = require('gulp');
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');
const moment = require('moment');
const path = require('path');

/** Make sure the source files exist. Mainly useful to avoid breaking things
 * when people attempt to do an "npm run build" in production. */
gulp.task('check-sources', function (done) {
    if (!fs.existsSync("src")) {
        console.log('\nSource directory "src" doesn\'t exist. Are you maybe trying to run the "npm run build" command in a production release? There\'s no need to do that anymore.\n');
        done();
        process.exit(1);
    }

    done();
});

/** Output the build date and the commit SHA to the build-info.json file */
gulp.task('output-build-info', function (done) {
    const execSync = childProcess.execSync;
    let buildDate = "N/A";
    let commitSha = "N/A";
    let dirtyInfo = "";

    // Capture build date
    try {
        buildDate = execSync('git log -1 --format=%ci').toString('utf8').trim();
    } catch (err) {
        console.log("Failed outputting the build date in the package.json file. " + err.message);
        return;
    }

    // Capture commit SHA
    try {
        commitSha = execSync('git rev-parse HEAD').toString('utf8').trim();
    } catch (err) {
        console.log("Failed outputting the commit SHA in the package.json file. " + err.message);
        return;
    }

    // Capture changes from the last commit
    try {
        execSync('git diff --quiet HEAD -- server');
    } catch (err) {
        dirtyInfo = "-dirty";
    }

    const buildInfo = {
        commitSha: commitSha + dirtyInfo,
        buildDate: buildDate
    };

    fs.writeFileSync("build-info.json", JSON.stringify(buildInfo, null, 4));

    done();
});

/** Copy files other than the TypeScript code (images, CSS, etc.) to the build dirctory */
gulp.task('copy-static-files', gulp.series('output-build-info', function () {
    return gulp.src(['./src/**/*', '!./**/*.ts'])
        .pipe(gulp.dest('dist'));
}));

/** Prepare for running the Istanbul tool for computing test coverage */
gulp.task('pre-coverage', function () {
    return gulp.src(['build/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
});

/** Check test coverage */
gulp.task('coverage', gulp.series('pre-coverage', function () {
    process.env.NODE_ENV = 'test';

    return gulp.src(getTestFiles(), { read: false })
        .pipe(mocha({
            "reporter": "spec"
        }))
        .pipe(istanbul.writeReports());
}));
const childProcess = require('child_process');
const fs = require('fs');
const gulp = require('gulp');
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');
const moment = require('moment');
const path = require('path');

/** Copy files other than the TypeScript code (images, CSS, etc.) to the build dirctory */
gulp.task('copy-static-files', ['output-build-info'], function () {
    return gulp.src(['./src/**/*', '!./**/*.ts'])
        .pipe(gulp.dest('build'));
});

/** Prepare for running the Istanbul tool for computing test coverage */
gulp.task('pre-coverage', function () {
    return gulp.src(['build/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
});

/** Check test coverage */
gulp.task('coverage', ['pre-coverage'], function () {
    process.env.NODE_ENV = 'test';

    return gulp.src(getTestFiles(), { read: false })
        .pipe(mocha({
            "reporter": "spec"
        }))
        .pipe(istanbul.writeReports());
});

/** Run all tests */
gulp.task('test', function () {
    return gulp.src(getTestFiles(), { read: false })
        .pipe(mocha());
});

/** Run API tests */
gulp.task('test-api', function () {
    return gulp.src(['build/test/integration/api.test.js'], { read: false })
        .pipe(mocha());
});

/** Run DB tests */
gulp.task('test-db', function () {
    return gulp.src(['build/test/unit/nedbAdapter.test.js'], { read: false })
        .pipe(mocha());
});

gulp.task('test-helpers', function () {
    return gulp.src(['build/test/unit/helpers.test.js'], { read: false })
        .pipe(mocha());
});

/** Output the build date and the commit SHA to the build-info.json file */
gulp.task('output-build-info', function () {
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
        execSync('git diff --quiet HEAD');
    } catch (err) {
        dirtyInfo = "-dirty";
    }

    const buildInfo = {
        commitSha: commitSha + dirtyInfo,
        buildDate: buildDate
    };

    fs.writeFileSync("build-info.json", JSON.stringify(buildInfo, null, 4));

});

function getTestFiles() {
    return [
        path.join('build', 'test', '**', '*.js')
    ];
}
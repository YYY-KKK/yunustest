var async = require('async');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var path = require('path');

/** Copy files other than the TypeScript code (images, CSS, etc.) to the build dirctory */
gulp.task('copy-files', function () {
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

function getTestFiles() {
    return [
        path.join('build', 'test', '**', '*.js')
    ];
}
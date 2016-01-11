var del = require('del');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var istanbul = require('gulp-istanbul');
var jasmine = require('gulp-jasmine');
var uglify = require('gulp-uglify');

gulp.task('clean', function() {
  return del(['build/*']);
});

// Check that the code is up to code
gulp.task('lint', function() {
  return gulp.src(['src/**/*.js', 'spec/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

// Run the unit tests without any coverage calculations
gulp.task('test', function() {
  return gulp.src(['spec/**/*.js'])
    .pipe(jasmine());
});

// Task that calculates the unit test coverage for the module
gulp.task('coverage', function() {
  return gulp.src('src/**/*.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function() {
      gulp.src(['spec/**/*.js'])
        .pipe(jasmine())
        .pipe(istanbul.writeReports({
          dir: 'build/coverage',
          reportOpts: {dir: 'build/coverage'}
        }));
    });
});

// Task that runs the unit tests and lint
gulp.task('quality', ['test', 'lint']);

// The build task - relies on 'clean' and 'quality' and 'styles
gulp.task('build', ['clean', 'quality'], function() {
  return gulp.src('src/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./build/'));
});

// On change to JavaScript files, run the default task
gulp.task('dev', ['default'], function() {
  gulp.watch(['spec/*.js', 'src/**/*.js', 'fixtures/**/*'], ['default']);
});

// alias watch == dev
gulp.task('watch', ['dev']);

gulp.task('default', ['build']);

var gulp = require('gulp'),
    less = require('gulp-less'),
    path = require('path'),
    watch = require('gulp-watch'),
    exec = require('gulp-exec');


gulp.task('less', function () {
    return gulp.src('./styles/less/app.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes') ]
        }))
        .pipe(gulp.dest('./styles/css/'));
});


gulp.task('watch', function() {
    gulp.watch('./styles/less/**/*.less', ['less']);
});

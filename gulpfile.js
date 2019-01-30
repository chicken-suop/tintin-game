

// Load plugins
const autoprefixer = require('autoprefixer');
const browsersync = require('browser-sync').create();
const cssnano = require('cssnano');
const del = require('del');
const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const newer = require('gulp-newer');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const ghpages = require('gh-pages');

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: 'dist',
    },
    port: 3000,
  });
  done();
}

// BrowserSync Reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean assets
function clean() {
  return del(['dist']);
}

// Optimize Images
function images() {
  return gulp.src('src/img/**/*')
    .pipe(newer('dist/img'))
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [{
            removeViewBox: false,
            collapseGroups: true,
          }],
        }),
      ]),
    )
    .pipe(gulp.dest('dist/img'));
}

// CSS task
function css() {
  return gulp.src('src/scss/**/*.scss')
    .pipe(plumber())
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(gulp.dest('dist'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(gulp.dest('dist'))
    .pipe(browsersync.stream());
}

// Transpile, concatenate and minify scripts
function js() {
  return gulp.src('src/js/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('main.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'))
    .pipe(browsersync.stream());
}

function html() {
  return gulp.src('src/**/*.html')
    .pipe(gulp.dest('dist'));
}

// Watch files
function watchFiles() {
  gulp.watch('src/scss/**/*', css);
  gulp.watch('src/js/**/*', js);
  gulp.watch('src/**/*.html', browserSyncReload);
  gulp.watch('src/img/**/*', images);
}

// define complex tasks
const build = gulp.series(clean, gulp.parallel(css, images, js, html));
const watch = gulp.parallel(watchFiles, browserSync);
const deploy = gulp.series(build, cb => ghpages.publish('dist', cb));

// export tasks
exports.build = build;
exports.watch = watch;
exports.deploy = deploy;
exports.default = build;

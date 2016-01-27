var fs = require('fs');
var files = process.argv.slice(3);
var destination = process.argv[2];
var concat = require('concat-files');
var replace = require('replace');


concat(files, destination, function() {
    replace({
        regex: '\\]\\[',
        replacement: ',',
        paths: [destination],
        recursive: true,
        silent: true
    });
});

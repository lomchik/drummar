var express = require('express');
var app = express();
var moment = require('moment');

var bodyParser = require('body-parser');
var multer = require('multer');
var hmmUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'hmm-data/')
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname + '-' + moment().format('HH.mm.ss') + '.json')
        }
    })
});

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('*', function(req, res) {
    var options = {
        root: __dirname + '/',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile(req.path, options);
});

app.post('/hmm-data', hmmUpload.single('hmm-file'), function (req, res, next) {
    //console.log(req.file);

    res.json({filename: req.file.filename});
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

var NNDrumDetector = require('./js/nn-drum-detector.js');
var fs = require('fs');
var expect = require('chai').expect;
var moment = require('moment');



function loadData(name) {
    var groupedData = {};
    NNDrumDetector.types.forEach(function(type) {
        var file =  './hmm-data/'+ type  + '-' + name + '-data.json';
        if (fs.existsSync(file)) {
            groupedData[type] = require(file);
        }
    });

    return groupedData;
}

function getTestData(data, count) {
    var test = {};

    for (var type in data) {
        test[type] = data[type].slice(0, count);
    }

    return test;
}


function test(groupedData) {
    var errors = {}, totalErrors = 0, sum = 0;
    for (var type in groupedData) {
        errors[type] = 0;
        groupedData[type].forEach(function(data) {
            var result = NNDrumDetector.detect(data);
            try {
                expect(result.type).to.equal(type);
            } catch(err) {
                console.error(err.message);
                errors[type]++;
                totalErrors++;
            }
            sum++;
        });
    }
    for (var type in groupedData) {
        console.log('testing ' + type + ' ('+groupedData[type].length+') errors: ' + (errors[type] / groupedData[type].length).toFixed(3));
    }

    console.log('total errors: ' + (totalErrors/sum).toFixed(3));
}

function saveNN(net) {
    fs.writeFileSync('nnetworks/n-net-' + moment().format('HH.mm.ss') + '.json' , JSON.stringify(net.toJSON()));
}


var learnData = loadData('learn');
var testData = loadData('test');
NNDrumDetector.init(require('./nnetworks/n-net-23.49.23.json'));
//NNDrumDetector.init(60);
//NNDrumDetector.learn(learnData, 100, 0.01);
NNDrumDetector.learn(learnData, 1000, 0.001);

saveNN(NNDrumDetector);
test(getTestData(testData, 1000));

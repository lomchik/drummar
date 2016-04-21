var synaptic = require('synaptic');
var dspHelpers = require('./dsp-helpers.js');

var NNDrumDetector = (function(synaptic, dspHelpers) {
    var types = ['bd', 'sd', 'hh', 'bd,sd', 'bd,hh', 'sd,hh', 'bd,sd,hh'];
    var myNet, trainer;

    var createNetwork = function (input, hidden, output) {

        var inputLayer = new synaptic.Layer(input);
        var hiddenLayer = new synaptic.Layer(hidden);
        var outputLayer = new synaptic.Layer(output);

        inputLayer.set({
            squash: synaptic.Neuron.squash.IDENTITY
        });

        hiddenLayer.set({
            squash: synaptic.Neuron.squash.LOGISTIC
        });

        inputLayer.project(hiddenLayer);
        hiddenLayer.project(outputLayer);


        return new synaptic.Network({
            input: inputLayer,
            hidden: [hiddenLayer],
            output: outputLayer
        });
    };

    var prepareFreqData = function(freqs) {
        var mels = dspHelpers.BFCC(freqs[1]);
        mels = dspHelpers.cutMinVal(mels);
        mels = dspHelpers.normalize(mels);

        var prevMels = dspHelpers.BFCC(freqs[0]);
        prevMels = dspHelpers.cutMinVal(prevMels);
        prevMels = dspHelpers.normalize(prevMels);

        var melsNext = dspHelpers.BFCC(freqs[2]);
        melsNext = dspHelpers.cutMinVal(melsNext);
        melsNext = dspHelpers.normalize(melsNext);

        return mels.concat(prevMels, melsNext);
    };

    return {
        types: types,
        learn: function(groupedData, iterations, rate) {
            var trainingSet = [];
            var zeros = Array(types.length);
            for (var i=0; i<zeros.length; i++) {
                zeros[i] = 0;
            }
            _.each(groupedData, function(data, type) {
                var output = _.clone(zeros);
                output[types.indexOf(type)] = 1;
                _.each(data, function(freq) {
                    trainingSet.push({input: prepareFreqData(freq), output: output});
                });
            });
            console.log('trainset length: ' + trainingSet.length);
            trainer.train(trainingSet,{
                rate: rate || .01,
                iterations: iterations || 30,
                error: .001,
                shuffle: true,
                log: 1,
                cost: synaptic.Trainer.cost.CROSS_ENTROPY,
                schedule: {
                    every: 1, // repeat this task every 5 iterations
                    do: function(data) {
                        // custom log
                        console.log(data);
                    }
                }
            });
            console.log('training finished');
        },
        detect: function(freq) {
            var probabilities = {},
                max = 0,
                detectedType,
                result = myNet.activate(prepareFreqData(freq));

            _(types).each(function(type, index) {
                probabilities[type] = result[index];
                if (max < probabilities[type]) {
                    detectedType = type;
                    max = probabilities[type];
                }
            });

            return {
                type: detectedType,
                probabilities: probabilities
            };
        },
        init: function(json) {
            if (typeof json == 'object') {
                myNet = synaptic.Network.fromJSON(json);
            }
            else {
                myNet = createNetwork(23*3, json || 40, types.length);
            }
            trainer = new synaptic.Trainer(myNet);
        },
        fromJSON: function (json) {
        },
        toJSON: function () {
            return myNet.toJSON();
        }
    };
})(synaptic, dspHelpers);

module.exports = NNDrumDetector;


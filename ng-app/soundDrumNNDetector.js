angular.module('sound')
    .factory('soundDrumNNDetector', function($rootScope, dspHelpers) {
        var types = ['bd', 'sd', 'hh', 'bd,sd', 'bd,hh', 'sd,hh', 'bd,sd,hh'];
        function Perceptron(input, hidden, output)
        {
            // create the layers
            var inputLayer = new Layer(input);
            var hiddenLayer = new Layer(hidden);
            var outputLayer = new Layer(output);

            // connect the layers
            inputLayer.project(hiddenLayer);
            hiddenLayer.project(outputLayer);

            // set the layers
            this.set({
                input: inputLayer,
                hidden: [hiddenLayer],
                output: outputLayer
            });
        }

        // extend the prototype chain
        Perceptron.prototype = new Network();
        Perceptron.prototype.constructor = Perceptron;

        var perceptron = new Perceptron(23*3,40,7);
        var trainer = new Trainer(perceptron);


        var divider = 1/100;
        var prepareFreqData = function(freqs) {
            var mels = dspHelpers.BFCC(freqs[1]);
            mels = dspHelpers.cutMinVal(mels);
            mels = dspHelpers.normalize(mels);
            mels = math.divide(mels, divider);

            var prevMels = dspHelpers.BFCC(freqs[0]);
            prevMels = dspHelpers.cutMinVal(prevMels);
            prevMels = dspHelpers.normalize(prevMels);
            prevMels = math.divide(prevMels, divider);

            var melsNext = dspHelpers.BFCC(freqs[2]);
            melsNext = dspHelpers.cutMinVal(melsNext);
            melsNext = dspHelpers.normalize(melsNext);
            melsNext = math.divide(melsNext, divider);

            return mels.concat(prevMels, melsNext);
        };

        return {
            types: types,
            learn: function(groupedData) {
                var trainingSet = [];
                _.each(groupedData, function(data, type) {
                    var output = Array(types.length).fill(0);
                    output[types.indexOf(type)] = 1;
                    _.each(data, function(freq) {
                        trainingSet.push({input: prepareFreqData(freq), output: output});
                    });
                });
                console.log(trainingSet.length);
                trainer.train(trainingSet,{
                    rate: .1,
                    iterations: 10,
                    error: .005,
                    shuffle: true,
                    log: 1000,
                    cost: Trainer.cost.CROSS_ENTROPY
                });
                console.log('training finished');
            },
            detect: function(freq) {
                var probabilities = {},
                    max = 0,
                    detectedType,
                    result = perceptron.activate(prepareFreqData(freq));

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
            }
        };
    });
angular.module('sound')
    .factory('soundDrumDetector', function($rootScope, detectorHelpers) {
        var types = ['bd', 'sd', 'hh', 'bd,sd', 'bd,hh', 'sd,hh', 'bd,sd,hh'];
        var states = [];
        var symbols = [];
        var divider = 10;
        var melSeparators = detectorHelpers.separate(2048, detectorHelpers.melScale);
        var models = {};
        var finalState = 'F';
        var prepareFreqData = function(freq) {
            var mels = detectorHelpers.separateFreqData(freq, melSeparators);
            mels = _.map(mels, function(val) {return ''+math.round(math.sum(val)/val.length/divider);} );

            return mels;
        };
        for (var i=0; i<255/10; i++) {
            symbols.push('' + i);
        }
        for (var i = 0; i<melSeparators.length;i++) {
            states.push(i);
        }
        states.push(finalState);

        return {
            types: types,
            learn: function(type, freqs) {
                var data = _(freqs).map(prepareFreqData);
                var model = models[type];
                if (!model) {
                    var model = models[type] = new HMM();
                }
                model.initialize(data, data[0].length);

                console.log(model.transitionProbability, model.emissionProbability);
            },
            detect: function(data) {
                var probabilities = {},
                    max = 0,
                    detectedType;
                _(models).each(function(model, type) {
                    probabilities[type] = model.viterbiApproximation(prepareFreqData(data));
                    if (max < probabilities[type]) {
                        detectedType = type;
                    }
                });


                return detectedType;// ['bd', 'sd', 'hh'] or other combinations
            }
        };
    });
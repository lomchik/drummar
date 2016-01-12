angular.module('sound')
    .factory('soundDrumDetector', function($rootScope, dspHelpers) {
        var types = ['bd', 'sd', 'hh', 'bd,sd', 'bd,hh', 'sd,hh', 'bd,sd,hh'];
        var states = [];
        var symbols = [];
        var divider =  5;
        var melSeparators = dspHelpers.separate(2048, dspHelpers.barkScale);
        var models = {};
        var finalState = 'F';
        var prepareFreqData = function(freqs) {
            var mels = _.map(dspHelpers.MFCC(freqs[0]), function(val) {return ''+math.round(math.sum(val)/divider);} );
            var melsNext = _.map(dspHelpers.MFCC(freqs[1]), function(val) {return ''+math.round(math.sum(val)/divider);} );
            var dMels = math.subtract(mels, melsNext);

            return mels.concat(melsNext);
        };

        return {
            types: types,
            learn: function(type, freqs) {
                var data = _(freqs).map(prepareFreqData);
                var model = models[type];
                if (!model) {
                    var model = models[type] = new HMM();
                }
                model.initialize(data, data[0].length);
                console.log(type, _.map(model.emissionProbability, function(values) {
                    return _.size(values);
                }).join(' '));

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
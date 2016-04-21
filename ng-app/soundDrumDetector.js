angular.module('sound')
    .factory('soundDrumDetector', function($rootScope, dspHelpers) {
        var types = ['bd', 'sd', 'hh', 'bd,sd', 'bd,hh', 'sd,hh', 'bd,sd,hh'];
        var models = {};
        var divider = 1/100;
        var prepareFreqData = function(freqs) {
            var mels = dspHelpers.BFCC(freqs[1]);
            mels = dspHelpers.cutMinVal(mels);
            mels = dspHelpers.normalize(mels);
            mels = math.divide(mels, divider);
            mels = math.round(mels);

            var prevMels = dspHelpers.BFCC(freqs[0]);
            prevMels = dspHelpers.cutMinVal(prevMels);
            prevMels = dspHelpers.normalize(prevMels);
            prevMels = math.divide(prevMels, divider);
            prevMels = math.round(prevMels);

            var melsNext = dspHelpers.BFCC(freqs[2]);
            melsNext = dspHelpers.cutMinVal(melsNext);
            melsNext = dspHelpers.normalize(melsNext);
            melsNext = math.divide(melsNext, divider);
            melsNext = math.round(melsNext);

            return mels.concat(prevMels, melsNext);
        };

        return {
            types: types,
            learn: function(types) {
                _.each(types, function(freqs, type) {
                    var data = _(freqs).map(prepareFreqData);
                    var model = models[type];
                    if (!model) {
                        var model = models[type] = new ModelMaker();//new HMM();
                    }
                    model.learn(data);
                    model.approximate();
                });
            },
            detect: function(data) {
                var probabilities = {},
                    max = 0,
                    detectedType;
                _(models).each(function(model, type) {
                    probabilities[type] = model.probability(prepareFreqData(data));
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
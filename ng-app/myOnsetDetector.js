angular.module('sound')
    .factory('myOnsetDetection', function(audioCtx, $rootScope, dspHelpers) {
        var fftSize = 2048;
        var $scope = $rootScope.$new();
        var analyser = audioCtx.createAnalyser();
        var processor = audioCtx.createScriptProcessor(fftSize, 1, 1);

        analyser.minDecibels = -90;
        analyser.maxDecibels = 0;
        analyser.smoothingTimeConstant = 0.75;
        analyser.fftSize = fftSize;

        analyser.connect(processor);
        processor.connect(audioCtx.destination);


        var self = {
            start: function() {
                processor.onaudioprocess = drumDetection;
               /* audioCtx.startRendering().then(function(renderedBuffer) {
                    console.log(renderedBuffer);
                });*/
            },
            stop: function() {
                processor.onaudioprocess = null;
            },
            onsets: [],
            localMaximums: [],
            ddf: [],
            analyzer: analyser,
            scope: $scope,
            processor: processor,
            reset: function() {
                self.onsets.length = 0;
                self.localMaximums.length = 0;
                self.ddf.length = 0;
            }
        };
        self.reset();
        var prevCompressedBandsEnergy = [];
        var prevEvent;
        var prevTopBand;
        var prevFreq;
        var prevPrevFreq;

        function ddFunction(freq) {
            var compressedBandsEnergy = _.map(freq, dspHelpers.muLawCompression);
            var differentiatedBandsEnergy = _.map(compressedBandsEnergy, function(value, i) {
                return value - (prevCompressedBandsEnergy[i] || 0);
            });
            var halfWaveDerivative = dspHelpers.halfWaveRectify(differentiatedBandsEnergy);
            var meanDz = math.mean(halfWaveDerivative);

            return meanDz * math.sum(freq)/255/freq.length;
        }

        var drumDetection = function(event) {
            var freq = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freq);
            freq = Array.prototype.slice.call(freq);

            self.ddf.push(ddFunction(freq));
            var length = self.ddf.length;
            var prevOnset;
            if (length > 3) {
                if (prevEvent && dspHelpers.isPeak(self.ddf, length - 2)) {
                    var value = self.ddf[length - 2];
                    if (value >= 0.05) {
                        prevOnset = {playTime: prevEvent.playbackTime*1000, topBand: prevTopBand, freq: prevFreq, nextFreq: freq, prevFreq: prevPrevFreq};
                        self.onsets.push(prevOnset);
                        $scope.$emit('onsetDetected', prevOnset);
                        self.localMaximums.push(2);
                    }
                    else {
                        self.localMaximums.push(1);
                    }
                }
                else {
                    self.localMaximums.push(0);
                }
            }
            prevEvent = event;
            prevPrevFreq = prevFreq;
            prevFreq = freq;
            prevTopBand = freq.indexOf(Math.max.apply(null, freq));
        };

        return self;
    });
angular.module('sound')
    .factory('myOnsetDetection', function(audioCtx, $rootScope, detectorHelpers) {
        var fftSize = 2048;
        var $scope = $rootScope.$new();
        var distortion = audioCtx.createWaveShaper();
        var gainNode = audioCtx.createGain();
        var biquadFilter = audioCtx.createBiquadFilter();
        var convolver = audioCtx.createConvolver();
        var analyser = audioCtx.createAnalyser();
        var processor = audioCtx.createScriptProcessor(fftSize, 1, 1);
        analyser.minDecibels = -90;
        analyser.maxDecibels = 0;
        analyser.smoothingTimeConstant = 0.25;
        analyser.fftSize = fftSize;

        analyser.connect(distortion);
        distortion.connect(biquadFilter);
        biquadFilter.connect(convolver);
        convolver.connect(gainNode);
        gainNode.connect(processor);
        processor.connect(audioCtx.destination);


        var self = {
            initRecordFingerPrint: function() {
                processor.onaudioprocess = drumDetection;
            },
            onsets: [],
            localMaximums: [],
            peaks: [],
            analyzer: analyser,
            scope: $scope,
            processor: processor,
            reset: function() {
                self.onsets.length = 0;
                self.localMaximums.length = 0;
                self.peaks.length = 0;
            }
        };
        self.reset();
        var prevCompressedBandsEnergy = [];
        var prevEvent;
        var prevTopBand;
        var prevFreq;
        var prevPrevFreq;

        var drumDetection = function(event) {

            var freq = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freq);
            freq = Array.prototype.slice.call(freq);
            //freq = freq.slice(0, 20);

            var tfreq = _(freq).map(function(val, i) {
                return i * val;
            });
            var compressedBandsEnergy = _.map(tfreq, detectorHelpers.muLawCompression);
            var differentiatedBandsEnergy = _.map(compressedBandsEnergy, function(value, i) {
                return value - (prevCompressedBandsEnergy[i] || 0);
            });
            var halfWaveDerivative = detectorHelpers.halfWaveRectify(differentiatedBandsEnergy);
            var meanDz = math.mean(halfWaveDerivative);

            self.peaks.push(meanDz);
            var length = self.peaks.length;
            var prevOnset;
            if (length > 3) {
                if (prevEvent && detectorHelpers.isPeak(self.peaks, length - 2)) {
                    var value = self.peaks[length - 2];
                    if (value >= 0.6) {
                        prevOnset = {playTime: prevEvent.playbackTime*1000, topBand: prevTopBand, freq: prevFreq, prevFreq: prevPrevFreq};
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
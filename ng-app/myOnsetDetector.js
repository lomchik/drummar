angular.module('sound')
    .factory('myOnsetDetection', function(audioCtx, offlineAudionCtx, $rootScope, dspHelpers) {

        return function(fftSize, detector, smoothingTimeConstant) {
            var fftSize = fftSize || 2048;
            var $scope = $rootScope.$new();
            var smoothingTimeConstant = smoothingTimeConstant;
            var runDetectorId;
            var windowTime = fftSize/audioCtx.sampleRate/2 * 1000;


            var self = {
                detector: detector,
                init: function (context) {
                    self.context = context;
                    self.analyser && self.analyser.disconnect();
                    self.analyser = self.context.createAnalyser();
                    clearInterval(runDetectorId)
                    self.processor && (self.processor.onaudioprocess = null);
                    self.processor = self.context.createScriptProcessor(fftSize, 1, 1);
                    self.gainNode && self.gainNode.disconnect();
                    self.gainNode = audioCtx.createGain();

                    self.gainNode.gain.value = 1;
                    self.analyser.minDecibels = -90;
                    self.analyser.maxDecibels = 0;
                    self.analyser.smoothingTimeConstant = smoothingTimeConstant;

                    self.analyser.fftSize = fftSize;
                    self.analyser.connect(self.processor);
                    self.processor.connect(self.context.destination);
                },
                start: function (source, context) {
                    self.init(context);
                    self.reset();
                    //TODO: count exactly time
                    runDetectorId = setInterval(runDetector, windowTime);
                    //self.processor.onaudioprocess = runDetector;
                    source.connect(self.gainNode);
                    self.gainNode.connect(self.analyser);
                    self.context.startRendering && self.context.startRendering();
                },
                stop: function () {
                    clearInterval(runDetectorId)
                    self.processor.onaudioprocess = null;
                },
                onsets: [],
                localMaximums: [],
                ddf: [],
                scope: $scope,
                reset: function () {
                    self.detector.reset();
                    self.onsets.length = 0;
                    self.localMaximums.length = 0;
                    self.ddf = self.detector.ddf;
                }
            };
            self.init(audioCtx);

            var runDetector = function (event) {
                var freq = new Uint8Array(self.analyser.frequencyBinCount);
                self.analyser.getByteFrequencyData(freq);
                freq = Array.prototype.slice.call(freq);

                var result = self.detector.check(freq,  1000);
                if (result) {
                    self.onsets.push(result);
                    self.localMaximums.push({value: 2, onset: result});
                    $scope.$emit('onsetDetected', result);
                }
                else {
                    self.localMaximums.push({value: result === false ? 1 : 0});
                }
            };

            return self;
        }
    });
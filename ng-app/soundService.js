navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);

angular.module('sound')
    .factory('audioCtx', function() {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        return audioCtx;
    })
    .factory('audioInput', function($q, audioCtx) {
        return $q(function(resolve, reject) {
            if (navigator.getUserMedia) {
                navigator.getUserMedia(
                    {
                        audio: true
                    },
                    function (stream) {
                        var source = audioCtx.createMediaStreamSource(stream);
                        resolve(source);
                    },
                    function (err) {
                        console.error('The following gUM error occured: ' + err);
                        reject();
                    }
                );
            } else {
                console.error('getUserMedia not supported on your browser!');
                reject();
            }
        });
    })
    .factory('onsetDetection', function(audioCtx) {
        var barkScale = [0, 20, 100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500],
        freq2Bark = function(freq) {
            return 8.96 * Math.log(0.978 + 5 * Math.log(0.994 + Math.pow((freq + 75.4)/2173, 1.347)));
        };
        return {
            barkScale: barkScale,
            separate: function(fftSize, scale) {
                var dividers = [], prevValue = -1, value;
                for (var i = 0; i < fftSize; i++) {
                    var freq = i * audioCtx.sampleRate/fftSize;
                    for (var j = 0; j< scale.length - 1 ; j++) {
                        if (freq > scale[j] && freq <= scale[j+1]) {
                            value = j;
                        }
                    }
                    if (value > prevValue) {
                        dividers.push(i);
                        prevValue = value;
                    }
                }

                return dividers;
            },
            freqToBin: function(freq, fftSize) {
                return Math.floor(freq * fftSize / audioCtx.sampleRate);
            },
            separateFreqData: function(data, separator) {
                var parts = [];
                for (var i = 0, l = separator.length; i < l; i++) {
                    parts.push(data.slice(separator[i], separator[i+1]));
                }

                return parts;
            },
            triangularWindow: function(array) {
                var sum = 0, length = array.length, middle = length / 2;
                for (var i = -middle, k = 0; Math.abs(i) <= middle && k < length; i++, k++) {
                    sum += ( -2 * Math.abs(i) / (length + 2) + 1) * array[k];
                }

                return sum / length;
            },
            hfc: function(array) {
                var sum = 0;
                for (var i = 0, l = array.length; i < l; i++) {
                    sum += (i+1) * array[i] * array[i];
                }

                return sum/array.length;
            },
            isPeak: function(array, index) {
                var val = array[index];
                return val > array[index-1] && val > array[index+1] && val > array[index-2];
            },
            firFilter: function(array, m, a) {
                var l = array.length,
                    m = Math.min(m, l - 1),
                    sum = 0,
                    a = a || 1;

                for (var i = l - m - 1; i < l ; i++) {
                    sum += array[i];
                }

                return array[l-1] + a * sum;
            },
            dynamicThreshold: function(array) {
                return 0.01 * math.median(array) + 0.05 * math.mean(array) - 0.028;
            },
            muLawCompression: function (value) {
                var m = Math.pow(10, 8);
                return Math.log(1 + m * value) / Math.log(1 + m);
            },
            halfWaveRectify: function(array)  {
                return _(array).map(function(value) {
                    return value < 0 ? 0 : value;
                });
            },
            percentile: function(arr, p) {
                if (arr.length === 0) return 0;
                if (typeof p !== 'number') throw new TypeError('p must be a number');
                if (p <= 0) return arr[0];
                if (p >= 1) return arr[arr.length - 1];

                var index = arr.length * p,
                    lower = Math.floor(index),
                    upper = lower + 1,
                    weight = index % 1;

                if (upper >= arr.length) return arr[lower];
                return arr[lower] * (1 - weight) + arr[upper] * weight;
            }
        };
    })
.factory('drumDetectionBattenberg', function(audioCtx, $rootScope, onsetDetection) {
        var fftSize = 2048;
        var $scope = $rootScope.$new();
        var distortion = audioCtx.createWaveShaper();
        var gainNode = audioCtx.createGain();
        var biquadFilter = audioCtx.createBiquadFilter();
        var convolver = audioCtx.createConvolver();
        var analyser = audioCtx.createAnalyser();
        var processor = audioCtx.createScriptProcessor(fftSize, 1, 1);
        var thresholdWindow = 7;//7
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
            bands: [],
            peaks: [],
            analyzer: analyser,
            scope: $scope,
            processor: processor,
            reset: function() {
                self.onsets.length = 0;
                self.localMaximums.length = 0;
                self.bands.length = 0;
                self.peaks.length = 0;
                self.peaks.fill(0, 0, thresholdWindow);
            }
        };
        self.reset();
        var separators = onsetDetection.separate(fftSize, onsetDetection.barkScale);
        var prevCompressedBandsEnergy = [];
        var percentile =  onsetDetection.percentile;
        var dynamicThreshold = function(array) {
            var t1 = 1.5 * (percentile(array, 0.75) - percentile(array, 0.25)) + percentile(array, 0.5) + 0.05;
            var t2 = 0.1 * percentile(array, 1);
            var p = 2;

            return Math.pow( ( Math.pow(t1, p) + Math.pow(t2, p) ) / 2, 1/p);
        };

        var generateHannBandsCompressedEnergy = function() {
            var hannSignal = [];
            for (var i = 0; i < fftSize; i++ ) {
                hannSignal.push(WindowFunction.Hann(fftSize, i));
            }
            var fft = new FFT(fftSize, audioCtx.sampleRate);
            fft.forward(hannSignal);
            var hannSpectrum = fft.spectrum;
            var bands = onsetDetection.separateFreqData(hannSpectrum, separators);
            var bandsEnergy = _.map(bands, onsetDetection.triangularWindow);
            var compressedBandsEnergy = _.map(bandsEnergy, onsetDetection.muLawCompression);

            return compressedBandsEnergy;
        };

        var prevEvent;
        var hannBandsCompressedEnergy = generateHannBandsCompressedEnergy();
        var prevTopBand;

        var drumDetection = function(event) {

            var freq = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freq);
            var bands = onsetDetection.separateFreqData(freq, separators);
            var bandsEnergy = _.map(bands, onsetDetection.triangularWindow);
            var compressedBandsEnergy = _.map(bandsEnergy, onsetDetection.muLawCompression);
            var hannSmoothedBandsEnergy = _.map(compressedBandsEnergy, function(value, i) {
                return value * hannBandsCompressedEnergy[i];
            });
            var differentiatedBandsEnergy = _.map(hannSmoothedBandsEnergy, function(value, i) {
                return value - (prevCompressedBandsEnergy[i] || 0);
            });
            var halfWaveDerivative = onsetDetection.halfWaveRectify(differentiatedBandsEnergy);
            var meanDz = math.mean(halfWaveDerivative);

            self.peaks.push(meanDz);
            var length = self.peaks.length;
            var prevOnset;
            if (length > 3) {
                if (prevEvent && onsetDetection.isPeak(self.peaks, length - 2)) {
                    var value = self.peaks[length - 2];
                    if (//self.peaks[length - 3] <= self.peaks[length-4] || self.peaks[length - 4] <= self.peaks[length-5]){
                    //value >= 0.95 * Math.max.apply(null, self.peaks) ){
                    value >= 0.8 *  Math.max.apply(null, self.peaks)) /*&&
                    (!self.onsets.length || value >= dynamicThreshold(self.peaks.slice( -thresholdWindow - 1, -1))) )*/ {
                        prevOnset = {playTime: prevEvent.playbackTime*1000, topBand: prevTopBand};
                        self.onsets.push(prevOnset);
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
            prevTopBand = freq.indexOf(Math.max.apply(null, freq));
        };

        return self;
    })
    /**
     * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.169.4504&rep=rep1&type=pdf
     *
     * */
    .factory('drumDetectionBossier', function(audioCtx, $rootScope, onsetDetection) {
        var $scope = $rootScope.$new();
        var distortion = audioCtx.createWaveShaper();
        var gainNode = audioCtx.createGain();
        var biquadFilter = audioCtx.createBiquadFilter();
        var convolver = audioCtx.createConvolver();
        var analyser = audioCtx.createAnalyser();
        var processor = audioCtx.createScriptProcessor(fftSize, 1, 1);
        var fftSize = 2048;
        analyser.minDecibels = -60;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.1;
        analyser.fftSize = fftSize;

        analyser.connect(distortion);
        distortion.connect(biquadFilter);
        biquadFilter.connect(convolver);
        convolver.connect(gainNode);
        gainNode.connect(processor);
        processor.connect(audioCtx.destination);

        var peaks = [];


        var self = {
            initRecordFingerPrint: function() {
                processor.onaudioprocess = drumDetection;
            },
            bandsDebugData: [],
            hfcData: [0],
            bands: [[],[],[],[]],
            peaks: [],
            postProcessedData: [],
            onsets: [],
            reset: function() {
                self.bandsDebugData.length = 0;
                self.hfcData.length = 0;
                self.bands.length = 0;
                self.peaks.length = 0;
                self.postProcessedData.length = 0;
                self.onsets.length = 0;
            },
            analyzer: analyser,
            scope: $scope,
            processor: processor
        };

        var drumDetection = (function(){
            var record = [], recording, prevValue = 0, currentValue = 0;
                analyzeData = function(data) {
                    data.forEach(function(afc) {
                        var max = 0, index = 0;
                        afc.forEach(function(amp, position) {
                            if (amp > max) {
                                max = amp;
                                index = position;
                            }
                        });

                    });
                };
            /*var customPeaksBands = {
                bd: {start: 8, end: 13, name: 'bd'},
                sd: {start: 10, end: 16, name: 'sd'},
                hh: {start: 227, end: 234, name: 'hh'}
            };
            var bookBands = {
                bd: {start: 90, end: 90, name: 'bd'},
                sd: {start: 260, end: 300, name: 'sd'},
                hh: {start: 9000, end: 9000, name: 'hh'}
            };
            var bands = bookBands;
            _(bands).each(function(band) {
                band.start = onsetDetection.freqToBin(band.start, fftSize);
                band.end = onsetDetection.freqToBin(band.end, fftSize);
                band.prevData = [].fill(0, 0, band.end - band.start +1);
                band.spectrDiff = [];
            });*/
            //console.log('bands', bands);
            //self.bands = bands;

            var prevEvent;
            return function(event) {
                var spectr = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(spectr);

                //HFC
                var sum = onsetDetection.hfc(spectr);
                self.hfcData.push(sum);
                self.postProcessedData.push(onsetDetection.firFilter(self.hfcData, 10, 0.1));
                //self.postProcessedData.push(sum);

                var length = self.postProcessedData.length;
                if (length > 1) {
                    if (onsetDetection.isPeak(self.postProcessedData, length - 2)
                        && self.postProcessedData[length - 1] > onsetDetection.dynamicThreshold(self.postProcessedData.slice(self.postProcessedData.length - 8, self.postProcessedData.length))) {
                        self.peaks.push(1);
                        self.onsets.push({playTime: prevEvent.timeStamp});
                    }
                    else {
                        self.peaks.push(0);
                    }
                }
                prevEvent = event;
            }
        })();


        return self;
    })
    .factory('soundLoader', function(audioCtx, $http, $q) {

        return {
            load: function(url) {
                return $q(function(resolve, reject) {
                    $http.get(url, {responseType: 'arraybuffer'}).success(function(data) {
                        audioCtx.decodeAudioData(data, function(buffer) {
                            var soundSource = audioCtx.createBufferSource();
                            soundSource.buffer = buffer;
                            resolve(soundSource);
                        }, function(err) {
                            console.log(arguments);
                        });
                    })
                });
            }
        }
    });
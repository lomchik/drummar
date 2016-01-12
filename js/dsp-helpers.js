var dspHelpers = (function() {
    var barkScale = [0, 20, 100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500],
        freq2Bark = function(freq) {
            return 8.96 * Math.log(0.978 + 5 * Math.log(0.994 + Math.pow((freq + 75.4)/2173, 1.347)));
        };

    var self = {
        audioCtx: new (window.AudioContext || window.webkitAudioContext)(),
        barkScale: barkScale,
        separate: function(fftSize, scale) {
            var dividers = [], prevValue = -1, value;
            for (var i = 0; i < fftSize/2; i++) {
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
        binToFreq: function(bin, fftSize) {
            return bin * audioCtx.sampleRate / (fftSize/2);
        },
        separateFreqData: function(data, separator) {
            var parts = [];
            for (var i = 0, l = separator.length; i < l; i++) {
                parts.push(data.slice(separator[i], separator[i+1]));
            }

            return parts;
        },
        triangularWindow: function(length) {
            var middle = (length-1)/ 2, array = [];
            for (var i = 0; i < length; i++) {
                array.push( -1/middle * Math.abs(i-middle) + 1 );
            }

            return array;
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
            return (    val > array[index-1] || (val == array[index-1] && val >=array[index-2]))  && val > array[index+1];
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
        applyWindow: function(windowFunc, array) {
            var window = windowFunc(array.length);

            return _.map(window, function(val, i) {
                return val * array[i];
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
        },
        battenbergDynamicThreshold: function(array) {
            var t1 = 1.5 * (percentile(array, 0.75) - percentile(array, 0.25)) + percentile(array, 0.5) + 0.05;
            var t2 = 0.1 * percentile(array, 1);
            var p = 2;

            return Math.pow( ( Math.pow(t1, p) + Math.pow(t2, p) ) / 2, 1/p);
        },
        generateHannBandsCompressedEnergy: function() {
            var hannSignal = [];
            for (var i = 0; i < fftSize; i++ ) {
                hannSignal.push(WindowFunction.Hann(fftSize, i));
            }
            var fft = new FFT(fftSize, audioCtx.sampleRate);
            fft.forward(hannSignal);
            var hannSpectrum = fft.spectrum;
            var bands = dspHelpers.separateFreqData(hannSpectrum, separators);
            var bandsEnergy = _.chain(bands).map(detectorHelpers.applyWindow.bind(null, detectorHelpers.triangularWindow)).map(math.sum).value();
            var compressedBandsEnergy = _.map(bandsEnergy, dspHelpers.muLawCompression);

            return compressedBandsEnergy;
        },
        DCT2: function(arr) {
            var result = [];
            for (var n = 0, M = arr.length; n < M; n++) {
                result[n] = 2*math.sum(_.map(arr, function(val, m) {
                        return val * math.cos(math.pi * n * (m + 0.5) / M)
                    }));
            }

            return result
        },
        MFCC: (function() {

            var melFreqTable = {
                0: 20,
                250: 160,
                500: 394,
                750: 670,
                1000: 1000,
                1250: 1420,
                1500: 1900,
                1750: 2450,
                2000: 3120,
                2250: 4000,
                2500: 5100,
                2750: 6600,
                3000: 9000,
                3250: 14000,
                3500: 19000
            };

            var melFreqArray = _.pairs(melFreqTable);
            var freqWindows = [];
            for (var i = 0; i < melFreqArray.length - 1; i++ ) {
                freqWindows.push([melFreqArray[i][1], melFreqArray[i+1][1]]);
            }
            //console.log(freqWindows);
            var binWindows = _.memoize(function(size) {
                var binFreqWidth = audioCtx.sampleRate/size;

                var binWindows = _.map(freqWindows, function(window) {
                    return [math.floor(window[0]/binFreqWidth), math.floor(window[1]/binFreqWidth)];
                });

                return binWindows;
            });

            return function(spec) {
                var windows = binWindows(spec.length);
                var energies = _(windows).map(function(window) {
                    var part = spec.slice(window[0], window[1]);
                    //part = _.map(part, function(val) { return val * val});

                    //var val = math.log(math.sum(self.applyWindow(self.triangularWindow, part))+0.1);

                    //return val;
                    return math.sum(part)/part.length;
                });

                return energies;
                //return self.DCT2(energies);
            };
        })()
    };
    var audioCtx = self.audioCtx;

    return self;
})();
var OnsetDetector = function() {
    this.ddf = [];
    this.reset();
};

OnsetDetector.prototype = {
    reset: function () {
        this.prevFreq = null;
        this.ddf.length = 0;
    },
    ddFunction: function(freq) {
        var compressedBandsEnergy = _.map(freq, dspHelpers.muLawCompression);
        var differentiatedBandsEnergy = _.map(compressedBandsEnergy, function(value, i) {
            return value - (prevCompressedBandsEnergy[i] || 0);
        });
        var halfWaveDerivative = dspHelpers.halfWaveRectify(differentiatedBandsEnergy);
        var meanDz = math.mean(halfWaveDerivative);

        return meanDz * math.sum(freq)/255/freq.length;
    },
    check: function(freq) {
        this.ddf.push(this.ddFunction(freq));
        var length = this.ddf.length;
        var prevOnset;
        if (length > 3) {
            if (prevEvent && dspHelpers.isPeak(this.ddf, length - 2)) {
                var value = this.ddf[length - 2];
                if (value >= 0.05) {
                    prevOnset = {freq: this.prevFreq, nextFreq: freq};
                    return prevOnset;
                }
                else {
                    return false;
                }
            }
            else {
                return null;
            }
        }
        this.prevFreq = freq;
    }
};
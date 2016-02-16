var OnsetDetector = function(minValue) {
    this.ddf = [];
    this.minValue = minValue;
    this.reset();
};

OnsetDetector.prototype = {
    reset: function () {
        this.prevFreq = null;
        this.prevPrevFreq = null;
        this.ddf.length = 0;
        this.playBackTime = null;
        this.prevCompressedBandsEnergy = []
    },
    /*ddFunction: function(freq) {
        var mcc = dspHelpers.MFCC(freq);
        var dmcc = Array(freq.length).fill(0);
        if (this.prevMcc) {
            dmcc = math.subtract(mcc, this.prevMcc);
        }
        var sum = math.sum(mcc);
        var df = math.sum(mcc) - math.sum(this.prevMcc);
        df = df > 0 ? df :0;
        var returnVal =  df;

        this.prevMcc = mcc;

        return returnVal;
    },*/
    ddFunction: function(freq) {
        var compressedBandsEnergy = _.map(freq, dspHelpers.muLawCompression);
        //useless
        var differentiatedBandsEnergy = _.map(compressedBandsEnergy, function(value, i) {
            return value - (this.prevCompressedBandsEnergy[i] || 0);
        }.bind(this));
        var halfWaveDerivative = dspHelpers.halfWaveRectify(differentiatedBandsEnergy);
        this.prevCompressedBandsEnergy = compressedBandsEnergy;

        var meanDz = math.mean(compressedBandsEnergy);

        //return math.sum(freq) / (255 * freq.length);

        return math.sum(freq) / (255 * freq.length) * meanDz;
    },
    check: function(freq, playbackTime) {
        this.ddf.push(this.ddFunction(freq));
        var length = this.ddf.length;
        var returnVal = null;
        if (length > 3 && dspHelpers.isPeak(this.ddf, length - 2)) {
            var value = this.ddf[length - 2];
            if (value >= this.minValue) {
                returnVal =  {
                    freq: this.prevFreq,
                    nextFreq: freq,
                    prevFreq: this.prevPrevFreq,
                    playTime: this.playBackTime
                };
            }
            else {
                returnVal =  false;
            }
        }
        this.prevPrevFreq = this.prevFreq;
        this.prevFreq = freq;
        this.playBackTime = playbackTime;
        return returnVal;
    }
};
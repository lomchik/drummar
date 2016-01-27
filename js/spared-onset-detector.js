var SparedOnsetDetector = function(minValue) {
    this.ddf = [];
    this.hfcDdf = [];
    this.plainDdf = [];
    this.minValue = minValue;
    this.max = 0;
    this.reset();
};

SparedOnsetDetector.prototype = {
    reset: function () {
        this.prevFreq = null;
        this.prevPrevFreq = null;
        this.hfcDdf.length = 0;
        this.plainDdf.length = 0;
        this.ddf.length = 0;
        this.playBackTime = null;
        this.prevCompressedBandsEnergy = []
    },
    plainDdFunction: function(freq) {
        var mfcc = dspHelpers.MFCC(freq);

        return math.mean(mfcc);
    },
    hfcDdFunction: function(freq) {


        return dspHelpers.hfc(freq);
    },
    check: function(freq, playbackTime) {
        var newVal = this.plainDdFunction(freq);/*
        if (newVal > this.max) {
            this.max = newVal;
            //this.minValue = 0;
        }*/
        this.ddf.push(newVal);
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
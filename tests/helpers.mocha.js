describe('helpers', function() {
    describe ('triangular window', function() {
        beforeEach(module('sound'));
        var helpers;
        beforeEach(inject(function(_dspHelpers_) {
            helpers = _dspHelpers_;
        }));
        it ('check triangularWindow function', function() {
            expect(helpers.triangularWindow(9)).to.eql([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]);
            expect(helpers.triangularWindow(10)).to.eql([0, 0.22222222222222232, 0.4444444444444444, 0.6666666666666667, 0.8888888888888888, 0.8888888888888888, 0.6666666666666667, 0.4444444444444444, 0.22222222222222232, 0]);
        });
        it ('check applyWindow function', function() {
            expect(helpers.applyWindow(helpers.triangularWindow, [1, 2, 0, 0.5, 5])).to.eql([0, 1, 0, 0.25, 0]);
        });
        it ('check DCT2 function', function() {
            expect(helpers.DCT2([4, 5, 6, 6])).to.eql([42, -4.460884994775325, -1.4142135623730976, 0.31702533556221013]);
            expect(helpers.DCT2([41, 7, 1, 89])).to.eql([276, -84.10023393270247, 172.53405460951757, -47.82416389718408]);
            expect(helpers.DCT2([41, 7, 1, 89, 7, 23])).to.eql([336, -10.778822191637175, -45.033320996790856, 149.90663761154804, 126.00000000000007, -160.68545980318532]);
        });

    })
});
angular.module('sound').controller('SoundPlayerController', function($scope, drumDetectionBattenberg, audioInput, soundLoader,
                                                                     audioCtx, midiParser, $http) {
    var soundAnalyser = drumDetectionBattenberg;
    $scope.analyser = soundAnalyser.analyzer;
    $scope.soundAnalyser = soundAnalyser;
    $scope.tracks = [
        'media/Test Rock Drum Fills.ogg',
        'media/16th Note Linear Fill.ogg',
        'media/Two Handed Hi-Hat Beat and 16th Note Linear Fill.ogg',
        'media/Two Handed Hi-Hat Beat.ogg',
        'media/ipad-air-material-take3.ogg',
        'media/iphone5s-material-80bpm-take3.ogg',
        'media/ipad-air-oneshot-middletom.ogg',
        'media/ipad-air-oneshot-crash.ogg',
        'media/ipad-air-oneshot-snare.ogg',
        'media/ipad-air-oneshot-bassdrum.ogg'
    ];
    $scope.midiTracks = [
        'media/Test Rock Drum Fills.mid.midi',
        'media/16th Note Linear Fill.midi',
        'media/Two Handed Hi-Hat Beat and 16th Note Linear Fill.midi',
        'media/Two Handed Hi-Hat Beat.midi'
    ];
    $scope.track = $scope.tracks[0];
    $scope.midiTrack = $scope.midiTracks[0];
    $scope.microphoneOn = false;
    $scope.midiOnsets= [];
    var playbackRate = 1;

    midiParser.getOnsets($scope.midiTracks[0], function(onsets) {
        angular.copy(onsets, $scope.midiOnsets);
    });

    audioInput.then(function(input) {
        $scope.input = input;
    });

    function prepareTiming(t) {
        var t = _.uniq(t, function(value) {
            return value.playTime;
        });

        if (t[0].playTime != 0) {
            var cut = t[0].playTime;
            _(t).each(function(val) {
                val.playTime -= cut;
                val.playTime = Math.round(val.playTime);
            });
        }

        return t;
    };

    function compareTimings(test, prot) {
        var i = 0;
        var timeDiff = 0;
        var correctlyDetectedOnsets = 0;
        var miss = 100;
        _(test).each(function(val) {
            val.detected = false;
        });
        _(prot).each(function (value, j) {
            value.detected = false;
            var time = value.playTime;

            for (;i < test.length; i++) {
                var diff = Math.abs(test[i].playTime - value.playTime);
                if (diff < miss) {
                    timeDiff += diff;
                    correctlyDetectedOnsets++;
                    test[i].detected = true;
                    value.detected = test[i];
                    break;
                }
                if (test[i].playTime > time) {
                    break;
                }
            }
        });

        var detectedOnsets = test.length;
        var actualOnsets = prot.length;

        var precision = correctlyDetectedOnsets/detectedOnsets;
        var recall = correctlyDetectedOnsets/actualOnsets;

        var F = 2 * precision * recall / (precision + recall);

        return  {
            detected: detectedOnsets,
            'correctly detected': correctlyDetectedOnsets,
            'actual': actualOnsets,
            'precision': precision,
            recall: recall,
            F: F,
            'avg time diff': timeDiff / correctlyDetectedOnsets,
            'actual onsets missed': _(prot).where({detected: false}),
            'detected onsets missed': _(test).where({detected: false}),
            'onsets': prot
        };
    };

    $scope.$watch('microphoneOn', function(value) {
        if (!$scope.input) return;
        value ? $scope.input.connect($scope.analyser) : $scope.input.disconnect();
    });
    $scope.$watch('track', function(newValue) {
        soundAnalyser.reset();
        soundLoader.load(newValue).then(function(trackSource) {
            $scope.source && $scope.source.disconnect();
            $scope.source = trackSource;
            $scope.source.onended = function() {
                _.each(soundAnalyser.onsets, function(value) {
                    value.playTime *= playbackRate;
                });
                /*$http.post('http://127.0.0.1:3000/test-onsets', JSON.stringify({founded: soundAnalyser.onsets, midi: $scope.midiTrack.replace('media/', '')})).then(function(result) {
                    console.log(result.data);
                });*/

                var results = compareTimings(prepareTiming(soundAnalyser.onsets), prepareTiming($scope.midiOnsets));
                var groupedByPitch = {};
                _(results.onsets).each(function(value) {
                    console.log(value.playTime, value.pitch, value.detected && value.detected.topBand);
                    groupedByPitch[value.pitch] = groupedByPitch[value.pitch] || {};
                    groupedByPitch[value.pitch][value.detected.topBand] = groupedByPitch[value.pitch][value.detected.topBand] || 0;
                    groupedByPitch[value.pitch][value.detected.topBand]++;
                });
                console.log(groupedByPitch);
            };
        });
    });
    $scope.$watch('source', function(newValue) {
        if (!$scope.source) return;
        $scope.source.playbackRate.value = playbackRate;
        $scope.source.connect($scope.analyser);
        $scope.source.connect(audioCtx.destination);
        $scope.source.start();
        soundAnalyser.initRecordFingerPrint();
    });
});
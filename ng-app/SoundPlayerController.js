angular.module('sound', ['ngFileSaver']).controller('SoundPlayerController', function($scope, myOnsetDetection, audioInput, soundLoader,
                                                                     audioCtx, midiParser, soundDrumDetector, $http,
                                                                     FileSaver, Blob) {
    var onsetDetection = myOnsetDetection;
    $scope.analyser = onsetDetection.analyzer;
    $scope.soundAnalyser = onsetDetection;
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
        'media/ipad-air-oneshot-bassdrum.ogg',
        'media/ipad-air-oneshot-hihat.ogg',
        'media/ipad-air-one-crash.ogg',
        'media/ipad-air-one-snare.ogg',
        'media/ipad-air-one-bassdrum.ogg',
        'media/ipad-air-one-hihat.ogg',
        'media/test-material-bd+hh.ogg',
        'media/test-material-sd+bd.ogg',
        'media/test-material-sd+hh.ogg',
        'media/test-material-hh+sd+bd.ogg'
    ];
    $scope.midiTracks = [
        'media/Test Rock Drum Fills.mid.midi',
        'media/16th Note Linear Fill.midi',
        'media/Two Handed Hi-Hat Beat and 16th Note Linear Fill.midi',
        'media/Two Handed Hi-Hat Beat.midi'
    ];
    $scope.track = $scope.tracks[13];
    $scope.midiTrack = $scope.midiTracks[0];
    $scope.microphoneOn = false;
    $scope.midiOnsets = [];
    $scope.drumTypes = soundDrumDetector.types;
    $scope.drumType = $scope.drumTypes[0];
    $scope.learnData = {};
    $scope.gatherSelectedData = function () {
        return _($scope.onsets).where({selected: true}).map(function(val){ return [val.freq, val.nextFreq]; });
    };
    $scope.learn = function() {
        soundDrumDetector.learn($scope.drumType, $scope.gatherSelectedData());
    };
    $scope.save = function() {
        $scope.learnData[$scope.drumType] = ($scope.learnData[$scope.drumType] || []).concat($scope.gatherSelectedData());
    };
    $scope.downloadData = function() {
        var data = new Blob([JSON.stringify($scope.learnData[$scope.drumType])], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs(data, $scope.drumType+'-learn-data.json');
        /*console.log($scope.learnData[$scope.drumType].length);
        downloadURI('data:text/json;base64,' + btoa(JSON.stringify($scope.learnData[$scope.drumType])), $scope.drumType+'-learn-data.json');
    */};
    function downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.click();
    }
    _.each($scope.drumTypes, function(type) {
        if (type.length > 2) return;
        $http.get('hmm-data/'+type+'-learn-data.json').success(function(data) {
            soundDrumDetector.learn(type, data);
        });
    });
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

    onsetDetection.scope.$on('onsetDetected', function(e, onset) {
        onset.selected = true;
        $scope.onsets.push(onset);
        $scope.$digest();
        if ($scope.onsets.length > 500) {
            $scope.source.stop();
            $scope.save();
            $scope.downloadData();
        }
        console.log('detected: ' + soundDrumDetector.detect([onset.freq, onset.nextFreq]));
    });

    $scope.$watch('microphoneOn', function(value) {
        if (!$scope.input) return;
        if (value) {
            onsetDetection.start();
            $scope.input.connect($scope.analyser)
        } else {
            $scope.input.disconnect();
        }
    });
    $scope.$watch('track', function(newValue) {
        onsetDetection.reset();
        $scope.onsets = [];
        soundLoader.load(newValue).then(function(trackSource) {
            $scope.source && $scope.source.disconnect();
            $scope.source = trackSource;

            $scope.source.onended = function() {
                console.log('finished');
                /*$http.post('http://127.0.0.1:3000/test-onsets', JSON.stringify({founded: soundAnalyser.onsets, midi: $scope.midiTrack.replace('media/', '')})).then(function(result) {
                    console.log(result.data);
                });*/
                onsetDetection.stop();
                $scope.$digest();
                var results = compareTimings(prepareTiming(onsetDetection.onsets), prepareTiming($scope.midiOnsets));
                //console.log(results);
                /*var groupedByPitch = {};
                _(results.onsets).each(function(value) {
                    console.log(value.playTime, value.pitch, value.detected && value.detected.topBand);
                    groupedByPitch[value.pitch] = groupedByPitch[value.pitch] || {};
                    groupedByPitch[value.pitch][value.detected.topBand] = groupedByPitch[value.pitch][value.detected.topBand] || 0;
                    groupedByPitch[value.pitch][value.detected.topBand]++;
                });
                console.log(groupedByPitch);
*/            };
        });
    });
    $scope.$watch('source', function(newValue) {
        if (!$scope.source) return;
        $scope.source.connect($scope.analyser);
        $scope.source.connect(audioCtx.destination);
        $scope.source.start();
        onsetDetection.start();
    });
});
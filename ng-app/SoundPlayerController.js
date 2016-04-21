angular.module('sound', ['ngFileSaver']).controller('SoundPlayerController', function($scope, myOnsetDetection, audioInput, soundLoader,
                                                                     audioCtx, offlineAudionCtx, midiParser, soundDrumNNDetector, $http,
                                                                     FileSaver, Blob, hmmData) {
    soundDrumDetector = soundDrumNNDetector;
    var onsetDetection = myOnsetDetection(2048, new SparedOnsetDetector(14000), 0.75);

    $scope.onsetDetection = onsetDetection;
    $scope.tracks = [
        {
        'file': 'media/ipad-air-material-take3.ogg'
    }, {
        'file': 'media/ipad-air-sd.ogg',
        'type': 'sd',
        'device': 'ipad-air',
        'onsets': 68
    }, {
        'file': 'media/ipad-air-bd.ogg',
        'type': 'bd',
        'device': 'ipad-air',
        'onsets': 35
    }, {
        'file': 'media/ipad-air-hh.ogg',
        'type': 'hh',
        'device': 'ipad-air',
        'onsets': 49
    }, {
        'file': 'media/test-material-bd+hh.ogg'
    }, {
        'file': 'media/test-material-sd+bd.ogg'
    }, {
        'file': 'media/test-material-sd+hh.ogg'
    }, {
        'file': 'media/test-material-hh+sd+bd.ogg'
    }, {
        'file': 'media/macbook-oneshot-hihat.ogg',
        'type': ''
    }, {
        'file': 'media/live-bd+hh.ogg',
        'type': 'bd,hh',
        'device': 'ipad-air',
        'onsets': 32
    }];

    $scope.track = $scope.tracks[2];
    $scope.microphoneOn = false;
    $scope.drumTypes = soundDrumDetector.types;
    $scope.drumType = $scope.drumTypes[0];
    $scope.learnData = {};
    $scope.offline = false;
    $scope.repeatVariants = [1,2,3,4,5,6,7,8,9,10, 20, 50];
    $scope.repeatTimes = 5;
    $scope.queue = [];
    $scope.gainNode = audioCtx.createGain();
    $scope.soundOn = false;
    $scope.onsetColors = {
        'hh': 'green',
        'sd': 'red',
        'bd': 'blue',
        'bd,hh': 'orange'
    };
    $scope.gatherStatistic = function(onsets, track, repeats) {
        var repeats = repeats || 1,
            statistic = {
                repeats: repeats,
                onsets: onsets.length,
                onsetsAccuracy: (onsets.length / track.onsets / repeats).toFixed(3)
            };

        _.each($scope.drumTypes.concat([undefined]), function(type) {
            var detected = _.where(onsets, {type: type});
            if (detected.length) {
                statistic[type] = {
                    detected: detected.length
                };
                if (type != track.type) {
                    statistic[type].probabilityDiff = _(detected).map(function(onset) {
                        return (onset.detected.probabilities[type] - onset.detected.probabilities[track.type])/onset.detected.probabilities[track.type];
                    });
                }
            }
        });

        statistic.detectionAccuracy = (_.where(onsets, {type: track.type}).length / onsets.length).toFixed(3);

        return statistic;
    };
    $scope.resetContext = function() {
        $scope.context = $scope.offline ? offlineAudionCtx() : audioCtx;
    };
    $scope.gatherLearnData = function(type, repeat, callback) {
        $scope.learnData[type] = null;
        var tracks = _.where($scope.tracks, {type: type}),
            list = [];
        for (var i = 0; i < repeat; i++) {
            list = list.concat(tracks);
        }
        angular.copy(list, $scope.queue);
        $scope.playTracks($scope.queue, function() {
            var stat = $scope.gatherStatistic($scope.learnData[type], tracks[0], repeat);
            console.log('total ' + type + ': ' +  stat.detectionAccuracy, stat);
            $scope.downloadData(type, repeat);
            callback && callback()
        });
    };
    $scope.playTracks = function(tracks, callback, trackCallback) {
        if (!tracks.length) {
            callback && callback();
            return;
        }
        var track = tracks.pop();
        $scope.playTrack(track, function(onsets) {
            $scope.save(track.type, onsets);
            $scope.playTracks(tracks, callback);
        });
    };

    $scope.save = function(type ,onsets) {
        $scope.learnData[type] = ($scope.learnData[type] || []).concat(onsets);
    };
    $scope.downloadData = function(type, repeats) {
        var data = _($scope.learnData[type]).map(function(val){
            return [val.prevFreq, val.freq, val.nextFreq];
        });
        hmmData.save(type+'x'+repeats, data).success(function(res) {
            console.log($scope.learnData[type].length + ' onsets saved', res.filename);
        });
     };
    $scope.playTrack = function(track, callback) {
        $scope.track = track;
        $scope.onsets = [];
        $scope.resetContext();
        $scope.playing = true;

        soundLoader.load($scope.track.file, $scope.context).then(function(trackSource) {
            $scope.source && $scope.source.disconnect();
            $scope.source = trackSource;

            $scope.source.onended = function() {
                onsetDetection.stop();
                if ($scope.track.midi) {
                    $http.post('http://127.0.0.1:3000/test-onsets', JSON.stringify({
                        founded: onsetDetection.onsets,
                        midi: $scope.track.midi.replace('media/', '')
                    })).then(function (result) {
                        console.log(result.data);
                    });
                }
                $scope.playing = false;
                $scope.$digest();
                (typeof callback == 'function') && callback($scope.onsets ,track);
                $scope.$emit('trackEnded');
            };
        });
    };
    $scope.stop = function() {
        $scope.playing = false;
        $scope.source && $scope.source.stop();
        $scope.queue.length = 0;
    };
    $scope.play = function() {
        $scope.stop();
        $scope.playTrack($scope.track, function(onsets, track) {
            console.log(track.type, $scope.gatherStatistic(onsets, track));
        });
    };
    $scope.soundSwitch = function(on) {
        $scope.gainNode.gain.value = on ? 1 :0;
    };

    $scope.test = function(repeats) {
        $scope.gatherLearnData('hh', repeats, function() {
            $scope.gatherLearnData('sd', repeats, function() {
                $scope.gatherLearnData('bd', repeats, function() {
                    $scope.gatherLearnData('bd,hh', repeats, function() {

                    })
                })
            })
        })
    };

    $scope.learnDetector = function(types) {
        var groupedData = {};

        _.each(types, function(type) {
            if (type.length > 2 && type != 'bd,hh') return;
                hmmData.load(type  + '-learn-data.json').success(function(data) {
                console.log('downloaded '+ type + ' onsets: ' + data.length)
                groupedData[type] = data;
                if (_.size(groupedData) == types.length) {
                    soundDrumDetector.learn(groupedData);
                }
            });
        });
    };

    $scope.learnDetector(['bd', 'hh', 'sd', 'bd,hh']);


    audioInput.then(function(input) {
        $scope.input = input;
    });


    onsetDetection.scope.$on('onsetDetected', function(e, onset) {
        onset.selected = true;
        $scope.onsets.push(onset);
        $scope.$digest();
        onset.detected = soundDrumDetector.detect([onset.prevFreq, onset.freq, onset.nextFreq]);
        onset.type = onset.detected.type;

        _.findWhere(onsetDetection.localMaximums, {onset: onset}).color = $scope.onsetColors[onset.type];
    });

    $scope.$watch('microphoneOn', function(value) {
        if (!$scope.input) return;

        if (value) {
            $scope.resetContext();
            onsetDetection.start($scope.input, $scope.context);
        } else {
            onsetDetection.stop();
            $scope.input.disconnect();
        }
    });
    $scope.$watch('source', function(newValue) {
        if (!$scope.source) return;
        $scope.source.connect($scope.gainNode);
        $scope.gainNode.connect($scope.context.destination);

        $scope.source.start();
        onsetDetection.start($scope.source, $scope.context, $scope.offline);
    });
    $scope.$watch('soundOn', $scope.soundSwitch)
});
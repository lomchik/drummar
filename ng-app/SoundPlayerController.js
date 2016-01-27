angular.module('sound', ['ngFileSaver']).controller('SoundPlayerController', function($scope, myOnsetDetection, audioInput, soundLoader,
                                                                     audioCtx, offlineAudionCtx, midiParser, soundDrumDetector, $http,
                                                                     FileSaver, Blob, hmmData) {
    var onsetDetection = myOnsetDetection(2048, new SparedOnsetDetector(70), 0.75);
    var sparedOnsetDetection// = myOnsetDetection(2048, new SparedOnsetDetector(70), 0.75);

    $scope.onsetDetection = onsetDetection;
    sparedOnsetDetection &&  ($scope.sparedOnsetDetection = sparedOnsetDetection);
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
        'file': 'media/test-material-bd+hh.ogg',
        'type': 'bd,hh'
    }, {
        'file': 'media/test-material-sd+bd.ogg',
        'type': 'bd,sd'
    }, {
        'file': 'media/test-material-sd+hh.ogg',
        'type': 'sd,hh'
    }, {
        'file': 'media/test-material-hh+sd+bd.ogg',
        'type': 'bd,sd,hh'
    }, {
        'file': 'media/macbook-oneshot-hihat.ogg',
        'type': ''
    }, {
        'file': 'media/live-bd+hh.ogg',
        'type': 'bd,hh',
        'device': 'ipad-air'
    }];

    $scope.track = $scope.tracks[2];
    $scope.microphoneOn = false;
    $scope.drumTypes = soundDrumDetector.types;
    $scope.drumType = $scope.drumTypes[0];
    $scope.learnData = {};
    $scope.offline = false;
    $scope.repeatVariants = [1,2,3,4,5,6,7,8,9,10, 20, 50];
    $scope.repeatTimes = 3;
    $scope.queue = [];
    $scope.gainNode = audioCtx.createGain();
    $scope.soundOn = false;
    $scope.onsetColors = {
        'hh': 'green',
        'sd': 'red',
        'bd': 'blue'
    };
    $scope.resetContext = function() {
        $scope.context = $scope.offline ? offlineAudionCtx() : audioCtx;
    };
    $scope.gatherSelectedData = function () {
        return _($scope.onsets).where({selected: true}).map(function(val){ return [val.prevFreq, val.freq, val.nextFreq]; });
    };
    $scope.gatherLearnData = function(type, repeat) {
        $scope.learnData[type] = null;
        var tracks = _.where($scope.tracks, {type: type}),
            list = [];
        for (var i = 0; i < repeat; i++) {
            list = list.concat(tracks);
        }
        angular.copy(list, $scope.queue);
        $scope.playTracks($scope.queue, function() {
            $scope.downloadData(type, repeat);
        });
    };
    $scope.playTracks = function(tracks, callback, trackCallback) {
        if (!tracks.length) {
            callback && callback();
            return;
        }
        var track = tracks.pop();
        $scope.playTrack(track, function(onsets) {
            $scope.save(track.type);
            $scope.playTracks(tracks, callback);
        });
    };
    $scope.save = function() {
        $scope.learnData[$scope.drumType] = ($scope.learnData[$scope.drumType] || []).concat($scope.gatherSelectedData());
    };
    $scope.downloadData = function(type, repeats) {
        /*
        var data = new Blob([JSON.stringify($scope.learnData[type])], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs(data, type+'-learn-data.json');*/
        hmmData.save(type+'x'+repeats, $scope.learnData[type]).success(function(res) {
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
                sparedOnsetDetection && sparedOnsetDetection.stop();
                console.log('total onsets:' + $scope.onsets.length);
                if ($scope.track.type) {
                    console.log('hh :' + (_.where($scope.onsets, {type: 'hh'}).length / $scope.onsets.length * 100).toFixed(2)
                        + ' sd :' + (_.where($scope.onsets, {type: 'sd'}).length / $scope.onsets.length * 100).toFixed(2)
                        + ' bd :' + (_.where($scope.onsets, {type: 'bd'}).length / $scope.onsets.length * 100).toFixed(2));
                }
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
                (typeof callback == 'function') && callback($scope.onsets);
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
        $scope.playTrack($scope.track);
    };
    $scope.soundSwitch = function(on) {
        $scope.gainNode.gain.value = on ? 1 :0;
    };


    _.each($scope.drumTypes, function(type) {
        if (type.length > 2) return;
        hmmData.load(type  + '-learn-data.json').success(function(data) {
            soundDrumDetector.learn(type, data);
        });
    });


    audioInput.then(function(input) {
        $scope.input = input;
    });


    onsetDetection.scope.$on('onsetDetected', function(e, onset) {
        onset.selected = true;
        $scope.onsets.push(onset);
        $scope.$digest();
        onset.type = soundDrumDetector.detect([onset.prevFreq, onset.freq, onset.nextFreq]);

        _.findWhere(onsetDetection.localMaximums, {onset: onset}).color = $scope.onsetColors[onset.type];
        //console.log('detected: ' + onset.type);
    });
    sparedOnsetDetection && sparedOnsetDetection.scope.$on('onsetDetected', function(e, onset) {
        onset.selected = true;
        $scope.onsets.push(onset);
        $scope.$digest();
        onset.type = soundDrumDetector.detect([onset.prevFreq, onset.freq, onset.nextFreq]);

        //_.findWhere(sparedOnsetDetection.localMaximums, {onset: onset}).color = $scope.onsetColors[onset.type];
    });
    $scope.$watch('microphoneOn', function(value) {
        if (!$scope.input) return;

        if (value) {
            $scope.resetContext();
            onsetDetection.start($scope.input, $scope.context);
            sparedOnsetDetection && sparedOnsetDetection.start($scope.input, $scope.context);
        } else {
            onsetDetection.stop();
            sparedOnsetDetection && sparedOnsetDetection.stop();
            $scope.input.disconnect();
        }
    });
    $scope.$watch('source', function(newValue) {
        if (!$scope.source) return;
        $scope.source.connect($scope.gainNode);
        $scope.gainNode.connect($scope.context.destination);

        $scope.source.start();
        onsetDetection.start($scope.source, $scope.context, $scope.offline);
        sparedOnsetDetection && sparedOnsetDetection.start($scope.source, $scope.context, $scope.offline);
    });
    $scope.$watch('soundOn', $scope.soundSwitch)
});
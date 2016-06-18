// Declare app level module which depends on views, and components
angular.module('app', ['ngMaterial', 'ngFitText', 'helpers'])
    .controller('mainController', function($scope, $document, tracksLoader, $timeout) {
        $scope.options = {
            speedOptions: [30, 60, 90, 120, 150],
            bpm: 120,
            pusher: [{}, {drum: 'hh', up: 0, key:83},{drum: 'sd', up: 0, key: 68},{drum: 'bd', up: 0, key:70}]
        };

        $scope.speedUp = function() {
            var currentSpeedIndex = $scope.options.speedOptions.indexOf($scope.options.bpm);
            if (currentSpeedIndex < $scope.options.speedOptions.length - 1) {
                $scope.options.bpm = $scope.options.speedOptions[currentSpeedIndex+1];
            }
        };
        $scope.speedDown = function() {
            var currentSpeedIndex = $scope.options.speedOptions.indexOf($scope.options.bpm);
            if (currentSpeedIndex > 0) {
                $scope.options.bpm = $scope.options.speedOptions[currentSpeedIndex-1];
            }
        };

        tracksLoader.get('track1').success(function(track) {
            $scope.options.track = track;
        });

        $scope.player = (function() {
            var promise,
                track,
                delay = 1720,
                queueEvent = function (e) {
                    player.pucks.push({
                        drum: e.drum,
                        move: e.move,
                        image: 'img/puck-'+e.move+'-'+e.drum+'.svg',
                        time: delay + e.time
                    });
                    var nextEvent = track.events[track.events.indexOf(e)+1];
                    if (nextEvent) {
                        promise = $timeout(queueEvent, nextEvent.time - e.time, true, nextEvent);
                    }
                },
                player =  {
                    pucks: [],
                    playing: false,
                    play: function (_track) {
                        this.startPlaying = new Date();
                        this.pucks.length = 0;
                        this.playing = true;
                        track = _track;
                        queueEvent(track.events[0]);
                    },
                    stop: function() {
                        $timeout.cancel(promise);
                        this.playing = false;
                        this.pucks.forEach(function (puck) {
                            puck.hide = 'hide';
                        });
                    },
                    shoot: function(drum) {
                        var shotTime = new Date() - this.startPlaying,
                            aim, minDiff = 99999;
                        player.pucks.forEach(function(puck) {
                            if (puck.drum == drum) {
                                var diff = Math.abs(puck.time - shotTime);
                                if (minDiff > diff) {
                                    minDiff = diff;
                                    aim = puck;
                                }
                            }
                        });
                        if (minDiff < 100) {
                            aim.hide = 'hide';
                        }
                        return {aim: aim, diff: minDiff};
                    }
                };

            return player;
        })();
        
        
        
        
        
        
        
        
        
        
        $document.bind('keydown', function(e) {
            if (e.which == 32) {
                $scope.player.playing
                    ? $scope.player.stop()
                    : $scope.player.play($scope.options.track);

                return;
            }
            $scope.options.pusher.forEach(function(pusher) {
                if (pusher.key == e.which) {
                    pusher.up = 1;
                }
            });
            $scope.$digest();
        });
        $document.bind('keyup', function(e) {
            $scope.options.pusher.forEach(function(pusher) {
                if (pusher.key == e.which) {
                    pusher.up = 0;
                    $scope.player.shoot(pusher.drum);
                    $scope.$digest();   
                }
            });
        });
    });
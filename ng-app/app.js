'use strict';

// Declare app level module which depends on views, and components
angular.module('app', ['ngMaterial', 'sound'])
    .controller('mainController', function($scope) {
        $scope.options = {
            speedOptions: [150, 120, 90, 60, 30],
            bpm: 120
        };
    });
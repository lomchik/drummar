angular.module('app')
    .factory('tracksLoader', function($http) {
        return {
            get: function(name) {
                return $http.get('tracks/'+name+'.json');
            }
        }
    });
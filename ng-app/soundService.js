navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);

angular.module('sound')
    .factory('hmmData', function($http) {

        return {
            save: function(name, data) {
                var fd = new FormData();
                var f = new File([JSON.stringify(data)], name);
                fd.append('hmm-file', f);

                return $http.post('hmm-data', fd, {
                    withCredentials: false,
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                });
            },
            load: function(name) {
                return $http.get('hmm-data/'+name);
            }
        }
    })
    .factory('dspHelpers', function() {
        return dspHelpers;
    })
    .factory('audioCtx', function(dspHelpers) {

        return dspHelpers.audioCtx;
    })
    .factory('offlineAudionCtx', function() {

        return function(size) {

            return new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1,(size||100)*44100,44100);
        };
    })
    .factory('audioInput', function($q, audioCtx) {
        return $q(function(resolve, reject) {
            if (navigator.getUserMedia) {
                navigator.getUserMedia(
                    {
                        audio: true
                    },
                    function (stream) {
                        var source = audioCtx.createMediaStreamSource(stream);
                        resolve(source);
                    },
                    function (err) {
                        console.error('The following gUM error occured: ' + err);
                        reject();
                    }
                );
            } else {
                console.error('getUserMedia not supported on your browser!');
                reject();
            }
        });
    })
    .factory('soundLoader', function($http, $q) {

        function syncStream(node){ // should be done by api itself. and hopefully will.
            var buf8 = new Uint8Array(node.buf);
            buf8.indexOf = Array.prototype.indexOf;
            var i=node.sync, b=buf8;
            while(1) {
                node.retry++;
                i=b.indexOf(0xFF,i); if(i==-1 || (b[i+1] & 0xE0 == 0xE0 )) break;
                i++;
            }
            if(i!=-1) {
                var tmp=node.buf.slice(i); //carefull there it returns copy
                delete(node.buf); node.buf=null;
                node.buf=tmp;
                node.sync=i;
                return true;
            }
            return false;
        }

        var decode = function(node, contex, resolve, reject) {
            contex.decodeAudioData(node.buf, function(buffer) {
                var soundSource = contex.createBufferSource();
                soundSource.buffer = buffer;
                resolve(soundSource);
            }, function(err) {
                if(syncStream(node)) {
                    decode(node, contex, resolve, reject);
                }
                else {
                    console.log(err);
                }
            });
        };


        return {
            load: function(url, contex) {
                return $q(function(resolve, reject) {
                    $http.get(url, {responseType: 'arraybuffer'}).success(function(data) {
                        var node = {};
                        node.buf= data;
                        node.sync=0;
                        node.retry=0;
                        decode(node, contex, resolve, reject);
                    })
                });
            }
        }
    });
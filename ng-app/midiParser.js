angular.module('sound')
.factory('midiParser', function() {

        var self =  {
            loadFile: function(url, success) {
                var oReq = new XMLHttpRequest();
                oReq.open("GET", url, true);
                oReq.responseType = "arraybuffer";
                oReq.onload = function() {
                    success(oReq.response);
                };
                oReq.send(null);
            },
            getOnsets: function(file, callback) {
                if (_.isString(file)) {
                    self.loadFile(file, function(file) {
                        self.parseOnsets(file, callback);
                    });
                }
            },
            parseOnsets: function(file, callback) {
                var midiFile = new MIDIFile(file);
                var events = midiFile.getMidiEvents();
                callback(_(events).chain().where({type: 8, subtype: 9}).map(function(event) {
                    return {playTime: event.playTime, pitch: event.param1, velocity: event.param2 };
                }).value());
            }
        };

        return self;
});
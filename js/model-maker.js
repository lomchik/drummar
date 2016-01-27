var ModelMaker = function() {

};

ModelMaker.prototype = {
    learn: function(matrix) {
        this.probabilities = [];
        var tmatrix = math.transpose(matrix);
        return this.probabilities = _.map(tmatrix, function(arr) {
            var length = arr.length,
                grouped = _.countBy(arr);

            for (var i in grouped) {
                grouped[i] /= length;
            }
            return grouped;
        });
    },
    approximate: function() {
        _.each(this.probabilities, function(obj) {
            var keys = _.keys(obj).sort();
            var sum = 1;
            var min = math.min(_.values(obj))/2;
            for (var i = 0, len = keys.length; i < len -1; i++) {
                var first = parseFloat(keys[i]),
                    second = parseFloat(keys[i+1]);

                if (second - first > 1) {
                    var approx = math.min(obj[second], obj[first]) / 2;
                    for (var j = first + 1; j < second; j++) {
                        sum += min;
                    }
                }
            }
            for (var i in obj) {
                obj[i] /= sum;
            }
        });

        return this.probabilities;
    },
    probability: function(arr) {
        var probability = 1;
        for (var i = 0, len = arr.length; i < len; i++) {
            probability *= this.probabilities[i][arr[i]] || 0
        }

        return probability;
    }
};
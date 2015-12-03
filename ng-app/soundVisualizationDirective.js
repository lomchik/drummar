angular.module('sound').directive('soundVisualization', function() {

    return {
        scope: {
            analyser: '='
        },
        replace: true,
        template: '<canvas width="640" height="100" style="width:100%"></canvas>',
        link: function(scope, element, attrs) {
            var canvas = element[0],
                canvasCtx = canvas.getContext("2d"),
                analyser = scope.analyser,
                WIDTH = canvas.width,
                HEIGHT = canvas.height;

            /*var intendedWidth = document.querySelector('.wrapper').clientWidth;

            canvas.setAttribute('width', intendedWidth);*/
            function visualize() {

                canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

                var bufferLength = analyser.frequencyBinCount;
                var dataArray = new Uint8Array(bufferLength);

                canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

                function draw() {
                    requestAnimationFrame(draw);

                    analyser.getByteFrequencyData(dataArray);

                    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                    var barWidth = (WIDTH / bufferLength);
                    var barHeight;
                    var x = 0;

                    for (var i = 0; i < bufferLength; i++) {
                        barHeight = dataArray[i];

                        canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
                        canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

                        x += barWidth;
                    }
                };

                draw();
            }

            visualize();
        }
    };
})
    .directive('bandsVisualization', function() {
        return {
            scope: {
                bands: '='
            },
            replace: true,
            template: '<canvas width="640" height="100" style="width:100%"></canvas>',
            link: function(scope, element, attrs) {
                var canvas = element[0],
                    canvasCtx = canvas.getContext("2d"),
                    WIDTH = canvas.width,
                    HEIGHT = canvas.height;

                function visualize() {

                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);


                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

                    function draw() {

                        var dataWidth = _(scope.bands).reduce(function(memo, val) {
                            return memo + val.width
                        }, 0);
                        var maxValue = 2;//Math.max.apply(null, _.pluck(scope.bands, 'value'));


                        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                        var barHeight;
                        var x = 0;

                        for (var i = 0; i < scope.bands.length; i++) {
                            var barWidth = (WIDTH * scope.bands[i].width / dataWidth);
                            barHeight = scope.bands[i].value/maxValue * HEIGHT;

                            canvasCtx.fillStyle = 'rgb(10,10,100)';
                            canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

                            x += barWidth;
                        }
                        requestAnimationFrame(draw);
                    }

                    draw();
                }

                visualize();
            }
        };
    })
    .directive('arrayVisualization', function() {
        return {
            scope: {
                data: '='
            },
            replace: true,
            template: '<canvas width="640" height="100" style="width:100%"></canvas>',
            link: function(scope, element, attrs) {
                var canvas = element[0],
                    canvasCtx = canvas.getContext("2d"),
                    WIDTH = canvas.width,
                    HEIGHT = canvas.height;

                /*var intendedWidth = document.querySelector('.wrapper').clientWidth;

                 canvas.setAttribute('width', intendedWidth);*/
                function visualize() {

                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);


                    function draw() {
                        if (scope.data) {
                            var dataArray = scope.data, bufferLength = dataArray.length;
                            var maxValue = Math.max.apply(null, dataArray);
                            canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                            canvasCtx.fillStyle = 'white';
                            canvasCtx.fillText('max: ' + maxValue, 10, 10)
                            var barHeight;
                            var x = 0;

                            canvasCtx.fillStyle = 'yellow';

                            for (var i = 0; i < bufferLength; i++) {
                                var value = dataArray[i] / maxValue;
                                var barWidth = 0.5;
                                barHeight = value * HEIGHT;
                                canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

                                x += barWidth + 0.5;
                            }
                        }

                        requestAnimationFrame(draw);
                    }

                    draw();
                }

                visualize();
            }
        };
    })
    .directive('timeline', function() {
        return {
            scope: {
                data: '='
            },
            replace: true,
            template: '<canvas width="640" height="100" style="width:100%"></canvas>',
            link: function(scope, element, attrs) {
                var canvas = element[0],
                    canvasCtx = canvas.getContext("2d"),
                    analyser = scope.analyser,
                    WIDTH = canvas.width,
                    HEIGHT = canvas.height;



                function visualize() {

                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);


                    function draw() {

                        var dataArray = scope.data, bufferLength = dataArray.length;
                        var maxValue = Math.max.apply(null, dataArray);
                        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                        canvasCtx.fillStyle = 'white';
                        canvasCtx.fillText('max: ' + maxValue, 10, 10)
                        var barHeight;
                        var x = 0;

                        canvasCtx.fillStyle = 'yellow';

                        for (var i = 0; i < bufferLength; i++) {
                            var value = dataArray[i]/maxValue;
                            var barWidth = 0.5;
                            barHeight = value * HEIGHT;

                            canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

                            x += barWidth + 0.5;
                        }
                    };

                    draw();
                }

                visualize();
            }
        };
    });
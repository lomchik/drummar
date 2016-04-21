angular.module('helpers', []);
angular.module('helpers')
    .directive('fitToParent', function($window) {

        function fit(W, H, w, h) {
            /*if (w/h > 1 ) {
                if (W/H < w/h) {
                    return {
                        width: W,
                        height: h * W/w
                    };
                }
                else {
                    return {
                        width: w * H/h,
                        height: h
                    };
                }
            }
            else {*/
                if (W/H < w/h) {
                    return {
                        width: W,
                        height: h * W/w
                    };
                }
                else {
                    return {
                        width: w * H/h,
                        height: H
                    };
                }
            //}
        };

        return {
            type: 'A',
            scope: {
                options: '=fitToParent'
            },
            link: function(scope, element) {
                var p = element.parent()[0],
                    el = element[0];

                scope.getParentDimensions = function () {
                    return {
                        'h': p.offsetHeight,
                        'w': p.offsetWidth
                    };
                };
                scope.$watch(scope.getParentDimensions, function (newValue, oldValue) {
                    console.log('update size');
                    var result = fit(newValue.w, newValue.h, scope.options.width, scope.options.height);
                    console.log(result);
                    el.style.width = result.width + 'px';
                    el.style.height = result.height + 'px';

                }, true);
            }
        }
    });

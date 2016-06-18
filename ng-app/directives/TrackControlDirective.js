angular.module('app')
.directive('tracksControl', function() {
   
    return {
        replace: true,
        template: '<g id="parts" transform="translate(1264.000000, 16.000000)" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg">' +
        '<rect stroke="#ABB4B9" stroke-width="4" fill-opacity="0.1" x="10" y="0" width="44" height="88"></rect>' +
        '<text id="PART-1" font-family="SFUIDisplay-Light, SF UI Display" font-size="18" font-weight="300">' +
        '<tspan x="5.24072266" y="379">PART-1</tspan>' +
        '</text>' +
        '</g>',
    };
});
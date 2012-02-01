/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    /** "note" functions -- uses console.log, but can be turned off. */
    var make_logger = function (category) {
        var prefix = '['+category+']';
        return function() {
            if (this.has_debug(category)) {
                var args = Array.prototype.slice.call(arguments, 0);
                args.unshift(prefix);
                console.log.apply(console, args);
            }
        };
    };

    // different log levels
    return {
        has_debug: function(category) { return true; },
        ACTOR: make_logger('ACTOR'),
        LAYOUT: make_logger('LAYOUT'),
        MISC: make_logger('MISC'),
        PAINT: make_logger('PAINT')
    };
});

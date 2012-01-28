/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    /** "note" functions -- uses console.log, but can be turned off. */
    // different log levels
    return {
        ACTOR: function() {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift("[ACTOR]");
            console.log.apply(console, args);
        },
        LAYOUT: function() {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift("[LAYOUT]");
            console.log.apply(console, args);
        },
        PAINT: function() {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift("[PAINT]");
            console.log.apply(console, args);
        },
    };
});

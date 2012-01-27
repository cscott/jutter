define([], function() {
    /** "note" functions -- uses console.log, but can be turned off. */
    // different log levels
    return {
        ACTOR: function() {
            arguments = Array.prototype.slice.call(arguments, 0);
            arguments.unshift("[ACTOR]");
            console.log.apply(console, arguments);
        },
        LAYOUT: function() {
            arguments = Array.prototype.slice.call(arguments, 0);
            arguments.unshift("[LAYOUT]");
            console.log.apply(console, arguments);
        },
        PAINT: function() {
            arguments = Array.prototype.slice.call(arguments, 0);
            arguments.unshift("[PAINT]");
            console.log.apply(console, arguments);
        },
    };
});

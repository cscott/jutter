define([], function() {
    /** "note" functions -- uses console.log, but can be turned off. */
    // different log levels
    return {
        ACTOR: function() {
            console.log.apply(console, arguments);
        }
    };
});

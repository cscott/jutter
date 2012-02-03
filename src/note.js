/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    // various debugging flag enumerations
    var DebugFlag = {
        MISC:                 1 << 0,
        ACTOR:                1 << 1,
        TEXTURE:              1 << 2,
        EVENT:                1 << 3,
        PAINT:                1 << 4,
        PANGO:                1 << 5,
        BACKEND:              1 << 6,
        SCHEDULER:            1 << 7,
        SCRIPT:               1 << 8,
        SHADER:               1 << 9,
        MULTISTAGE:           1 << 10,
        ANIMATION:            1 << 11,
        LAYOUT:               1 << 12,
        PICK:                 1 << 13,
        EVENTLOOP:            1 << 14,
        CLIPPING:             1 << 15,
        OOB_TRANSFORMS:       1 << 16
    };
    Object.freeze(DebugFlag);

    var PickDebugFlag = {
        NOP_PICKING:          1 << 0,
        DUMP_PICK_BUFFERS:    1 << 1
    };
    Object.freeze(PickDebugFlag);

    var DrawDebugFlag = {
        DISABLE_SWAP_EVENTS:        1 << 0,
        DISABLE_CLIPPED_REDRAWS:    1 << 1,
        REDRAWS:                    1 << 2,
        PAINT_VOLUMES:              1 << 3,
        DISABLE_CULLING:            1 << 4,
        DISABLE_OFFSCREEN_REDIRECT: 1 << 5,
        CONTINUOUS_REDRAW:          1 << 6,
        PAINT_DEFORM_TILES:         1 << 7
    };
    Object.freeze(DrawDebugFlag);

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
        _flags: ~0,
        has_debug: function(category) {
            return !!(this._flags & DebugFlag[category]);
        },
        DebugFlag: DebugFlag,
        PickDebugFlag: PickDebugFlag,
        DrawDebugFlag: DrawDebugFlag,
        enable_debug: function(category) {
            console.assert(category in DebugFlag);
            this._flags |= DebugFlag[category];
        },
        disable_debug: function(category) {
            console.assert(category in DebugFlag);
            this._flags &= (~DebugFlag[category]);
        },
        // various CLUTTER_NOTE log levels
        MISC: make_logger('MISC'),
        ACTOR: make_logger('ACTOR'),
        TEXTURE: make_logger('TEXTURE'),
        EVENT: make_logger('EVENT'),
        PAINT: make_logger('PAINT'),
        PANGO: make_logger('PANGO'),
        BACKEND: make_logger('BACKEND'),
        SCHEDULER: make_logger('SCHEDULER'),
        SCRIPT: make_logger('SCRIPT'),
        SHADER: make_logger('SHADER'),
        MULTISTAGE: make_logger('MULTISTAGE'),
        ANIMATION: make_logger('ANIMATION'),
        LAYOUT: make_logger('LAYOUT'),
        PICK: make_logger('PICK'),
        EVENTLOOP: make_logger('EVENTLOOP'),
        CLIPPING: make_logger('CLIPPING'),
        OOB_TRANSFORMS: make_logger('OOB_TRANSFORMS'),
    };
});

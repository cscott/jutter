/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {

/**
 * ClutterEventType:
 * @CLUTTER_NOTHING: Empty event
 * @CLUTTER_KEY_PRESS: Key press event
 * @CLUTTER_KEY_RELEASE: Key release event
 * @CLUTTER_MOTION: Pointer motion event
 * @CLUTTER_ENTER: Actor enter event
 * @CLUTTER_LEAVE: Actor leave event
 * @CLUTTER_BUTTON_PRESS: Pointer button press event
 * @CLUTTER_BUTTON_RELEASE: Pointer button release event
 * @CLUTTER_SCROLL: Pointer scroll event
 * @CLUTTER_STAGE_STATE: Stage stage change event
 * @CLUTTER_DESTROY_NOTIFY: Destroy notification event
 * @CLUTTER_CLIENT_MESSAGE: Client message event
 * @CLUTTER_DELETE: Stage delete event
 *
 * Types of events.
 *
 * Since: 0.4
 */
    var Type = {
        NOTHING:         0,
        KEY_PRESS:       1,
        KEY_RELEASE:     2,
        MOTION:          3,
        ENTER:           4,
        LEAVE:           5,
        BUTTON_PRESS:    6,
        BUTTON_RELEASE:  7,
        SCROLL:          8,
        STAGE_STATE:     9,
        DESTROY_NOTIFY: 10,
        CLIENT_MESSAGE: 11,
        DELETE:         12
    };
    Object.freeze(Type);

    var Flags = {
        NONE:           0,
        SYNTHETIC:      1 << 0
    };
    Object.freeze(Flags);

    var Event = function(type) {
        this.type = type;
        this.time = 0;
        this.source = null;
        this.stage = null;
        this._flags = Flags.NONE;
    };
    Event.prototype = {
        get state() {
            if (this.type === Type.KEY_PRESS ||
                this.type === Type.KEY_RELEASE ||
                this.type === Type.BUTTON_PRESS ||
                this.type === Type.BUTTON_RELEASE ||
                this.type === Type.MOTION ||
                this.type === Type.SCROLL) {
                return this.modifier_state;
            }
            return 0;
        },
        set state(state) {
            if (this.type === Type.KEY_PRESS ||
                this.type === Type.KEY_RELEASE ||
                this.type === Type.BUTTON_PRESS ||
                this.type === Type.BUTTON_RELEASE ||
                this.type === Type.MOTION ||
                this.type === Type.SCROLL) {
                this.modifier_state = state;
            }
        },
        get coords() {
            if (this.type === Type.ENTER ||
                this.type === Type.LEAVE ||
                this.type === Type.BUTTON_PRESS ||
                this.type === Type.BUTTON_RELEASE ||
                this.type === Type.MOTION ||
                this.type === Type.SCROLL) {
                return [this.x, this.y];
            }
            return [0,0];
        },
        set coords(c) {
            var x = c[0], y = c[1];
            if (this.type === Type.ENTER ||
                this.type === Type.LEAVE ||
                this.type === Type.BUTTON_PRESS ||
                this.type === Type.BUTTON_RELEASE ||
                this.type === Type.MOTION ||
                this.type === Type.SCROLL) {
                this.x = x;
                this.y = y;
            }
        },
        get flags() {
            return this._flags;
        },
        set flags(flags) {
            if (this._flags === flags) { return; }
            this._flags = flags | Flags.SYNTHETIC;
        }
    };
    Event.Flags = Flags;
    Event.Type = Type;
    Event.PROPAGATE = false;
    Event.STOP = true;

    return Event;
});

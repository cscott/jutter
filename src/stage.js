/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./color", "./dom", "./enums", "./group", "./note"], function(Actor, Color, Dom, Enums, Group, Note) {
    var PickMode = Enums.PickMode;

    /** A 'Stage' is a top-level window on which child actors are placed
     *  and manipulated.  In jutter, a Stage corresponds to a WebGL canvas.
     */
    var PRIVATE = "_stage_private";
    var DEFAULT_STAGE_COLOR = Color.BLACK;

    var StagePrivate = function() {
        this._init();
    };
    StagePrivate.prototype = {
        _init: function() {
            this.event_queue = [];

            this.is_fullscreen = false;
            this.is_user_resizable = false;
            this.is_cursor_visible = true;
            this.use_fog = false;
            this.throttle_motion_events = true;
            this.min_size_changed = false;

            /* XXX - we need to keep the invariant that calling
             * clutter_set_motion_event_enabled() before the stage creation
             * will cause motion event delivery to be disabled on any newly
             * created stage. this can go away when we break API and remove
             * deprecated functions.
             */
            this.motion_events_enabled = true;//_clutter_context_get_motion_events_enabled ();

            this.color = DEFAULT_STAGE_COLOR.copy();

            // XXX INITIALIZE this.perspective
            // XXX INITIALIZE this.projection
            // XXX INITIALIZE this.view

            /* FIXME - remove for 2.0 */
            this.fog = {};
            this.fog.z_near = 1.0;
            this.fog.z_far  = 2.0;

            this.relayout_pending = true;
            this.have_valid_pick_buffer = false;
            this.pick_buffer_mode = PickMode.INVALID;
            this.picks_per_frame = 0;
            this.paint_volume_stack = [];
        }
    };
    var _default_stage = null;
    var Stage = function(params) {
        this._init(params);
    };
    Stage.prototype = Object.create(Group.prototype, {
        _init: {
            value: function(params) {
                Group.prototype._init.call(this); // superclass init

                /* a stage is a top-level object */
                this._set_toplevel_flag();

                this[PRIVATE] = new StagePrivate();

                Note.BACKEND("Creating stage from the default backend");
                // XXX CSA maybe we should do something here.

                if (!params) { params = {}; }
                if (!params.canvas) {
                    if (!_default_stage) {
                        _default_stage = this;
                        params.canvas = Dom.initial_canvas;
                    } else {
                        params.canvas = Dom.new_canvas();
                    }
                }
                var geom = { width: params.canvas.width,
                             height: params.canvas.height };
                this.canvas = params.canvas; // so that set title() will work.
                // other initialization from clutter_stage_init()
                this.reactive = true;
                this.title = "Jutter"; // XXX "g_get_prgname()"
                this.key_focus = null;

                this.connect('notify::min_width', this._notify_min_size);
                this.connect('notify::min_height', this._notify_min_size);

                this.viewport = { x: 0, y: 0,
                                  width: geom.width, height: geom.height };

                this.set_props(params);
            }
        },
        _notify_min_size: {
            value: function() {
                console.log("NOTIFY MIN SIZE", arguments);
            }
        },
        acquire_pick_id: {
            value: function(actor) {
            }
        },
        _release_pick_id: {
            value: function(pick_id) {
            }
        },
        key_focus: {
            get: function() {
                if (this[PRIVATE].key_focused_actor) {
                    return this[PRIVATE].key_focused_actor;
                }
                return this;
            },
            set: function(actor) {
                console.assert(actor===null || actor instanceof Actor);
                if (this[PRIVATE].key_focused_actor === actor) {
                    return;
                }
                if (this[PRIVATE].key_focused_actor) {
                    var old_focused_actor = this[PRIVATE].key_focused_actor;

                    /* set key_focused_actor to NULL before emitting the signal or someone
                     * might hide the previously focused actor in the signal handler and we'd
                     * get re-entrant call and get glib critical from g_object_weak_unref
                     */

                    this[PRIVATE].key_focused_actor = null;

                    old_focused_actor.emit('key_focus_out');
                } else {
                    this.emit('key_focus_out');
                }

                /* Note, if someone changes key focus in focus-out signal handler we'd be
                 * overriding the latter call below moving the focus where it was originally
                 * intended. The order of events would be:
                 *   1st focus-out, 2nd focus-out (on stage), 2nd focus-in, 1st focus-in
                 */

                if (actor) {
                    this[PRIVATE].key_focused_actor = actor;

                    actor.emit('key_focus_in');
                } else {
                    this.emit('key_focus_in');
                }
                this.emit('key_focus');
            }
        },
        color: {
            get: function() { return this[PRIVATE].color; },
            set: function(color) {
                this[PRIVATE].color.set_from_color(color);
                this.queue_redraw();
                this.notify('color');
            }
        },
        title: {
            get: function() {
                return Dom.get_title(this.canvas);
            },
            set: function(new_title) {
                Dom.set_title(this.canvas, new_title);
                this.notify('title');
            }
        },
        get_pick_buffer_valid: {
            value: function(mode) {
                if (this[PRIVATE].pick_buffer_mode !== mode) {
                    return false;
                }
                return this[PRIVATE].have_valid_pick_buffer;
            }
        },
        set_pick_buffer_valid: {
            value: function(valid, mode) {
                this[PRIVATE].have_valid_pick_buffer = !!valid;
                this[PRIVATE].pick_buffer_mode = mode;
            }
        },
    });
    Stage.get_default = function() {
        if (!_default_stage) { new Stage(); }
        return _default_stage;
    };

    return Stage;
});

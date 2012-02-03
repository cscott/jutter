/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./actor-box", "./color", "./dom", "./enums", "./feature", "./group", "./note"], function(Actor, ActorBox, Color, Dom, Enums, Feature, Group, Note) {
    var PickMode = Enums.PickMode;

    /** A 'Stage' is a top-level window on which child actors are placed
     *  and manipulated.  In jutter, a Stage corresponds to a WebGL canvas.
     */
    var PRIVATE = "_stage_private";
    var DEFAULT_STAGE_COLOR = Color.BLACK;

    var Hint = {
        NONE: 0,
        NO_CLEAR_ON_PAINT: 1 << 0
    };
    Object.freeze(Hint);

    var QueueRedrawEntry = function(actor) {
        this.actor = actor;
        this.has_clip = false;
    };

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
                Object.getPrototypeOf(Stage.prototype)._init.call(this);

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
        real_get_preferred_width: {
            value: function(for_height) {
                var priv = this[PRIVATE];
                var width = 0;

                if (priv.impl) {
                    var geom = priv.impl.get_geometry();
                    width = geom.width;
                }
                return { min_width: width, natural_width: width };
            }
        },
        real_get_preferred_height: {
            value: function(for_width) {
                var priv = this[PRIVATE];
                var height = 0;

                if (priv.impl) {
                    var geom = priv.impl.get_geometry();
                    height = geom.height;
                }
                return { min_height: height, natural_height: height };
            }
        },
        queue_full_redraw: {
            value: function() {
                if (this.in_destruction) { return; }

                this.queue_redraw();

                /* Just calling clutter_actor_queue_redraw will typically only
                 * redraw the bounding box of the children parented on the stage but
                 * in this case we really need to ensure that the full stage is
                 * redrawn so we add a NULL redraw clip to the stage window. */
                var stage_window = this._window;
                if (!stage_window) {
                    return;
                }

                stage_window._add_redraw_clip(null);
            }
        },
        is_default: {
            get: function() {
                var stage_manager = StageManager.get_default();
                if (this !== stage_manager.get_default_stage()) {
                    return false;
                }
                var impl = this._window;
                if (impl !== this._default_window) {
                    return false;
                }
                return true;
            }
        },
        real_allocate: {
            value: function(box, flags) {
                var priv = this[PRIVATE];

                var origin_changed = !!(flags & Enums.AllocationFlags.ABSOLUTE_ORIGIN_CHANGED);

                if (!priv.impl) { return; }

                /* our old allocation */
                var prev_geom = this.allocation_geometry;

                /* the current allocation */
                var width = box.width;
                var height = box.height;

                /* the current Stage implementation size */
                var window_size = priv.impl.geometry;

                /* if the stage is fixed size (for instance, it's using a EGL framebuffer)
                 * then we simply ignore any allocation request and override the
                 * allocation chain - because we cannot forcibly change the size of the
                 * stage window.
                 */
                if (!Feature.available(Feature.STAGE_STATIC)) {
                    Note.LAYOUT("Following allocation to",width,"x",height,
                                "with origin",
                                origin_changed ? "changed" : "not changed");

                    this.set_allocation(box, flags |
                                        Enums.AllocationFlags.DELEGATE_LAYOUT);

                    /* Ensure the window is sized correctly */
                    if (!priv.is_fullscreen) {
                        if (priv.min_size_changed) {
                            var min_width = this.min_width;
                            var min_width_set = this.min_width_set;
                            var min_height = this.min_height;
                            var min_height_set = this.min_height_set;

                            if (!min_width_set) { min_width = 1; }
                            if (!min_height_set) { min_height = 1; }

                            if (width < min_width) { width = min_width; }
                            if (height < min_height) { height = min_height; }

                            priv.min_size_changed = false;
                        }
                        if (window_size.width !== width ||
                            window_size.height !== height) {
                            priv.impl.resize(width, height);
                        }
                    }
                } else {
                    var override = new ActorBox(0, 0,
                                                window_size.width,
                                                window_size.height);

                    Note.LAYOUT("Overriding original allocation of",
                                width, "x", height, "with",
                                override.x2, "x", override.y2,
                                "with origin",
                                origin_changed ? "changed" : "not changed");

                    /* and store the overridden allocation */
                    this.set_allocation(override, flags |
                                        Enums.AllocationFlags.DELEGATE_LAYOUT);
                }

                /* XXX: Until Cogl becomes fully responsible for backend windows
                 * Clutter need to manually keep it informed of the current window
                 * size. We do this after the allocation above so that the stage
                 * window has a chance to update the window size based on the
                 * allocation.
                 */
                window_size = priv.impl.geometry;
                // XXX CSA XXX
                //cogl_onscreen_clutter_backend_set_size (window_size.width,
                //                                        window_size.height);

                /* reset the viewport if the allocation effectively changed */
                var geom = this.allocation_geometry;
                if (geom.width !== prev_geom.width ||
                    geom.height !== prev_geom.height) {
                    this.set_viewport(0, 0, geom.width, geom.height);

                    /* Note: we don't assume that set_viewport will queue a full redraw
                     * since it may bail-out early if something preemptively set the
                     * viewport before the stage was really allocated its new size.
                     */
                    this.queue_full_redraw ();
                }
            }
        },

        _update_active_framebuffer: {
            value: function() {
                throw new Error("Unimplemented");
            }
        },

/* This provides a common point of entry for painting the scenegraph
 * for picking or painting...
 *
 * XXX: Instead of having a toplevel 2D clip region, it might be
 * better to have a clip volume within the view frustum. This could
 * allow us to avoid projecting actors into window coordinates to
 * be able to cull them.
 */
        _do_paint: {
            value: function(clip) {
                var priv = this[PRIVATE];
                var geom = priv.impl.geometry;
                var clip_poly = [];

                if (clip) {
                    clip_poly[0] = Math.max (clip.x, 0);
                    clip_poly[1] = Math.max (clip.y, 0);
                    clip_poly[2] = Math.min (clip.x + clip.width, geom.width);
                    clip_poly[3] = clip_poly[1];
                    clip_poly[4] = clip_poly[2];
                    clip_poly[5] = Math.min (clip.y + clip.height, geom.height);
                    clip_poly[6] = clip_poly[0];
                    clip_poly[7] = clip_poly[5];
                } else {
                    clip_poly[0] = 0;
                    clip_poly[1] = 0;
                    clip_poly[2] = geom.width;
                    clip_poly[3] = 0;
                    clip_poly[4] = geom.width;
                    clip_poly[5] = geom.height;
                    clip_poly[6] = 0;
                    clip_poly[7] = geom.height;
                }

                Note.CLIPPING("Setting stage clip to: x=",clip_poly[0],
                              ", y=", clip_poly[1],
                              ", width=", clip_poly[2] - clip_poly[0],
                              ", height=", clip_poly[5] - clip_poly[1]);

                // XXX CSA XXX
                //_cogl_util_get_eye_planes_for_screen_poly (
                //    clip_poly, 4, priv.viewport,
                //    &priv.projection, &priv.inverse_projection,
                //    priv.current_clip_planes);

                //_clutter_stage_paint_volume_stack_free_all (stage);
                this._update_active_framebuffer();
                this.paint();
            }
        },

        // line 672
        real_paint: {
            value: function() {
                console.error("Unimplemented");
            }
        },

        // line 742
        real_pick: {
            value: function() {
                console.error("Unimplemented");
            }
        },

        // line 754
        real_get_paint_volume: {
            value: function(volume) {
                /* Returning False effectively means Clutter has to assume it covers
                 * everything... */
                return false;
            }
        },

        // XXX CSA XXX MORE STUFF HERE


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

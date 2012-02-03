/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false, window:false */
'use strict';
define(["./backend", "./backend-webgl", "./settings"], function(Backend, BackendWebGL, Settings) {
    var ClutterCntx = null;

    var clutter_create_backend = function() {
        var backend = window.JUTTER_BACKEND;
        var retval = null;

        if ((!backend) || backend === "WebGL") {
            retval = new BackendWebGL();
        } else if (!backend) {
            console.error("No default backend found.");
        } else {
            console.error("Unsupported backend", backend);
        }
        return retval;
    };

/*
 * ClutterMainContext:
 *
 * The shared state of Clutter
 */
    var Context = function() {
    };
    Context.prototype = {
        /* the main windowing system backend */
        backend: null,

        /* the object holding all the stage instances */
        stage_manager: null,

        /* the clock driving all the frame operations */
        master_clock: null,

        /* the main event queue */
        events_queue: null,

        pick_mode: 0, // XXX CSA

        /* mapping between reused integer ids and actors */
        id_pool: null, // XXX CSA ?

        /* default FPS; this is only used if we cannot sync to vblank */
        frame_rate: 0, // XXX CSA

        /* actors with a grab on all devices */
        pointer_grab_actor: null,
        keyboard_grab_actor: null,

        /* stack of actors with shaders during paint */
        shaders: null,

        /* fb bit masks for col<->id mapping in picking */
        fb_r_mask: 0,
        fb_g_mask: 0,
        fb_b_mask: 0,
        fb_r_mask_used: 0,
        fb_g_mask_used: 0,
        fb_b_mask_used: 0,

        /* Global Pango context */
        pango_context: null,
        /* Global font map */
        font_map: null,

        current_event: null,
        last_event_time: 0,

        /* list of repaint functions installed through
         * clutter_threads_add_repaint_func()
         */
        repaint_funcs: null,
        last_repaint_id: 1,

        /* main settings singleton */
        settings: null,

        /* boolean flags */
        is_initialized          : false,
        motion_events_per_actor : true,
        defer_display_setup     : false,
        options_parsed          : false,
        show_fps                : false
    };
    // CSA: from clutter_context_get_default_unlocked in clutter-main.c
    Context._get_default = function() {
        if (ClutterCntx === null) {
            debugger;
            var ctx = new Context();

            /* create the windowing system backend */
            ctx.backend = clutter_create_backend ();

            /* create the default settings object, and store a back pointer to
             * the backend singleton
             */
            ctx.settings = Settings.get_default ();
            ctx.settings.backend = ctx.backend;

            ClutterCntx = ctx;
        }
        return ClutterCntx;
    };
    Context.acquire_id = function(thing) {
        console.warn("acquire_id unimplemented");
        return 0;
    };

    // CSA: avoid circular reference by defining this method here.
/**
 * clutter_get_default_backend:
 *
 * Retrieves the default #ClutterBackend used by Clutter. The
 * #ClutterBackend holds backend-specific configuration options.
 *
 * Return value: (transfer none): the default backend. You should
 *   not ref or unref the returned object. Applications should rarely
 *   need to use this.
 *
 * Since: 0.4
 */
    Backend.get_default = function() {
        var context = Context._get_default();
        return context.backend;
    };

    return Context;
});

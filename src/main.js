/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./backend", "./context", "./enums", "./feature", "./note"], function(Backend, Context, Enums, Feature, Note) {

    var Options = {
        default_fps: 60,
        show_fps: true,
    };
    var is_initialized = false;

    var Main = function() {
        console.error("Abstract module.  Do not instantiate.");
    };
    Main.prototype = { };

/* pre_parse_hook: initialise variables depending on environment
 * variables; these variables might be overridden by the command
 * line arguments that are going to be parsed after.
 */
    var pre_parse_hook = function() {
        if (is_initialized) { return true; }

        // XXX CSA XXX set locale

        /* read the configuration file, if it exists; the configuration file
         * determines the initial state of the settings, so that command line
         * arguments can override them.
         */
        //clutter_config_read ();

        var context = Context._get_default ();

        //clutter_context->id_pool = _clutter_id_pool_new (256);

        var backend = context.backend;
        console.assert(backend instanceof Backend);

        // XXX CSA XXX set debug flags
        // XXX CSA XXX set other flags

        return backend.pre_parse();
    };
    /* post_parse_hook: initialise the context and data structures
     * and opens the X display
     */
    var post_parse_hook = function() {
        if (is_initialized) { return true; }

        var context = Context._get_default ();
        var backend = context.backend;
        console.assert(backend instanceof Backend);

        // XXX CSA XXX transfer frame_rate and show_fps to Context.
        context.frame_rate = Options.default_fps;
        context.show_fps = Options.show_fps;
        context.options_parsed = true;

        /* If not asked to defer display setup, call clutter_init_real(),
         * which in turn calls the backend post parse hooks.
         */
        if (!context.defer_display_setup) {
            return Main.init_real();
        }
        return true;
    };

    var base_init_initialized = false;
    Main.base_init = function() {
        if (base_init_initialized) { return; }
        base_init_initialized = true;

        // XXX CSA gettext initialization

        // XXX threads initialization
    };

    Main.init_real = function() {
        /* Note, creates backend if not already existing, though parse args will
         * have likely created it
         */
        var ctx = Context._get_default();
        var backend = ctx.backend;

        if (!ctx.options_parsed) {
            console.error("You must parse options before calling init()");
            return false;
        }
        /*
         * Call backend post parse hooks.
         */
        if (!backend.post_parse()) {
            return false;
        }

        /* If we are displaying the regions that would get redrawn with clipped
         * redraws enabled we actually have to disable the clipped redrawing
         * because otherwise we end up with nasty trails of rectangles everywhere.
         */
        if (Options.paint_debug_flags & Note.DrawDebugFlag.REDRAWS) {
            Options.paint_debug_flags |= Note.DrawDebugFlag.DISABLE_CLIPPED_REDRAWS;
        }

        /* The same is true when drawing the outlines of paint volumes... */
        if (Options.paint_debug_flags & Note.DrawDebugFlag.PAINT_VOLUMES) {
            Options.paint_debug_flags |=
                Note.DrawDebugFlag.DISABLE_CLIPPED_REDRAWS | Note.DrawDebugFlag.DISABLE_CULLING;
        }

        /* this will take care of initializing Cogl's state and
         * query the GL machinery for features
         */
        if (!Feature.init()) {
            console.error("Feature initialization failure.");
            return false;
        }

        Options.text_direction = get_text_direction();

        /* Initiate event collection */
        backend._init_events();

        is_initialized = true;
        ctx.is_initialized = true;

        /* Initialize a11y */
        if (Options.enable_accessibility) {
            Cally.accessibility_init();
        }

        return true;
    };

    Main.parse_args = function(args) {
        // XXX CSA parse the arguments maybe someday?
        // XXX CSA parse the cogl arguments, too?

        // XXX CSA this is part of clutter_get_option_group:
        Main.base_init();
        var context = Context._get_default();
        //context.backend.add_options(null);

        pre_parse_hook();
        post_parse_hook();

        return true;
    };

    Main.init = function(args) {
        if (is_initialized) {
            return true;
        }

        Main.base_init();

        var ctx = Context._get_default();

        if (!ctx.defer_display_setup) {
            /* parse_args will trigger backend creation and things like
             * DISPLAY connection etc.
             */
            if (!Main.parse_args(args)) {
                console.error("Unable to initialize");
                return false;
            }
        } else {
            if (!clutter_init_real()) {
                console.error("Unable to initialize");
                return false;
            }
        }
        return true;
    };

    return Main;
});

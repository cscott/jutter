/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false, window:false */
'use strict';
define(["./note", "./settings", "./signals"], function(Note, Settings, Signals) {
    var current_context_stage = null; // for Backend.ensure_context()

    var PRIVATE = "_backend_private";
    var BackendPrivate = function() {
    };
    BackendPrivate.prototype = {
        units_per_em: -1.0,
        units_serial: 1,
        event_translators: []
    };
    var Backend = function() {
        this._init();
    };
    var XXXUNIMPLEMENTEDXXX = function() { console.error("Unimplemented"); };
    Backend.prototype = {
        stage_window_type: null,
        dispose: XXXUNIMPLEMENTEDXXX,
        finalize: XXXUNIMPLEMENTEDXXX,
        real_resolution_changed: XXXUNIMPLEMENTEDXXX,
        real_font_changed: XXXUNIMPLEMENTEDXXX,
        real_create_context: XXXUNIMPLEMENTEDXXX,
        real_ensure_context: XXXUNIMPLEMENTEDXXX,
        real_get_features: XXXUNIMPLEMENTEDXXX,
        real_create_stage: XXXUNIMPLEMENTEDXXX,
        real_init_events: XXXUNIMPLEMENTEDXXX,
        real_translate_event: XXXUNIMPLEMENTEDXXX,
        _init: function() {
            this[PRIVATE] = new BackendPrivate();
        },
        add_options: function(group) {
            if (this.real_add_options) {
                this.real_add_options(group);
            }
        },
        pre_parse: function() {
            if (this.real_pre_parse) {
                return this.real_pre_parse();
            }
            return true;
        },
        post_parse: function() {
            if (this.real_post_parse) {
                return this.real_post_parse();
            }
            return true;
        },
        create_stage: function(wrapper) {
            var stage_window = null;
            if (this.real_create_stage) {
                stage_window = this.real_create_stage(wrapper);
            }
            return stage_window;
        },
        create_context: function() {
            return this.real_create_context();
        },
        _ensure_context_internal: function(stage) {
            if (this.real_ensure_context) {
                this.real_ensure_context(stage);
            }
        },
        ensure_context: function(stage) {
            if (current_context_stage !== stage ||
                !stage.realized) {
                var new_stage = null;
                if (!stage.realized) {
                    Note.BACKEND("Stage is not realized, unsetting the stage",
                                 stage);
                } else {
                    new_stage = stage;
                    Note.BACKEND("Setting the new stage", new_stage);
                }
                /* XXX: Until Cogl becomes fully responsible for backend windows
                 * Clutter need to manually keep it informed of the current window size
                 *
                 * NB: This must be done after we ensure_context above because Cogl
                 * always assumes there is a current GL context.
                 */
                if (new_stage !== null) {
                    this._ensure_context_internal(new_stage);

                    var size = stage.size;

                    Note.BACKEND("XXX CSA SKIPPING BACKEND_SET_SIZE");
                    //cogl_onscreen_clutter_backend_set_size (width, height);

                    /* Eventually we will have a separate CoglFramebuffer for
                     * each stage and each one will track private projection
                     * matrix and viewport state, but until then we need to make
                     * sure we update the projection and viewport whenever we
                     * switch between stages.
                     *
                     * This dirty mechanism will ensure they are asserted before
                     * the next paint...
                     */
                    stage._dirty_viewport();
                    stage._dirty_projection();
                }

                /* FIXME: With a NULL stage and thus no active context it may make more
                 * sense to clean the context but then re call with the default stage
                 * so at least there is some kind of context in place (as to avoid
                 * potential issue of GL calls with no context).
                 */
                current_context_stage = new_stage;
            } else {
                Note.BACKEND("Stage is the same");
            }
        },
        get_features: function() {
            /* we need to have a context here; so we create the
             * GL context first and the ask for features. if the
             * context already exists this should be a no-op
             */
            if (this.real_create_context) {
                var res = this.real_create_context();
                if (!res) {
                    console.error("Unable to create a context");
                }
                return 0;
            }
            if (this.real_get_features) {
                return this.real_get_features();
            }
            return 0;
        },
        init_events: function() {
            this.real_init_events();
        },
/**
 * clutter_backend_get_resolution:
 * @backend: a #ClutterBackend
 *
 * Gets the resolution for font handling on the screen.
 *
 * The resolution is a scale factor between points specified in a
 * #PangoFontDescription and cairo units. The default value is 96.0,
 * meaning that a 10 point font will be 13 units
 * high (10 * 96. / 72. = 13.3).
 *
 * Clutter will set the resolution using the current backend when
 * initializing; the resolution is also stored in the
 * #ClutterSettings:font-dpi property.
 *
 * Return value: the current resolution, or -1 if no resolution
 *   has been set.
 *
 * Since: 0.4
 */
        get resolution() {
            var settings = Settings.get_default();
            var resolution = settings.font_dpi;
            if (resolution < 0) {
                return 96.0;
            }
            return resolution / 1024.0;
        },
        translate_event: function(native_, event) {
            return this.real_translate_event(native_, event);
        },
        _add_event_translator: function(translator) {
            var priv = this[PRIVATE];

            if (priv.event_translators.indexOf(translator) >= 0) {
                return;
            }
            priv.event_translators.push(translator);
        },
        _remove_event_translator: function(translator) {
            var priv = this[PRIVATE];

            var i = priv.event_translators.indexOf(translator);
            if (i < 0) {
                return;
            }
            priv.event_translators.splice(i, 1);
        },
        get_cogl_context: XXXUNIMPLEMENTEDXXX,

        real_settings_changed: function() {
            // this is unimplemented in clutter upstream
            console.warn("real_settings_changed invoked.");
        },
    };
    Signals.addSignalMethods(Backend.prototype);
    Signals.register(Backend.prototype, {
  /**
   * ClutterBackend::resolution-changed:
   * @backend: the #ClutterBackend that emitted the signal
   *
   * The ::resolution-changed signal is emitted each time the font
   * resolutions has been changed through #ClutterSettings.
   *
   * Since: 1.0
   */
        resolution_changed: {
            flags: Signals.RUN_FIRST,
            closure: 'real_resolution_changed'
        },
  /**
   * ClutterBackend::font-changed:
   * @backend: the #ClutterBackend that emitted the signal
   *
   * The ::font-changed signal is emitted each time the font options
   * have been changed through #ClutterSettings.
   *
   * Since: 1.0
   */
        font_changed: {
            flags: Signals.RUN_FIRST,
            closure: 'real_font_changed'
        },
  /**
   * ClutterBackend::settings-changed:
   * @backend: the #ClutterBackend that emitted the signal
   *
   * The ::settings-changed signal is emitted each time the #ClutterSettings
   * properties have been changed.
   *
   * Since: 1.4
   */
        settings_changed: {
            flags: Signals.RUN_FIRST,
            closure: 'real_settings_changed'
        }
    });



    return Backend;
});

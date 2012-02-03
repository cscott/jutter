/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./context", "./note"], function(Context, Note) {
    var __features = {
        flags: 0,
        features_set: false
    };

    var Feature = function() {
        console.error("Abstract type.  Should not be instantiated.");
    };
/**
 * ClutterFeatureFlags:
 * @CLUTTER_FEATURE_TEXTURE_NPOT: Set if NPOTS textures supported.
 * @CLUTTER_FEATURE_SYNC_TO_VBLANK: Set if vblank syncing supported.
 * @CLUTTER_FEATURE_TEXTURE_YUV: Set if YUV based textures supported.
 * @CLUTTER_FEATURE_TEXTURE_READ_PIXELS: Set if texture pixels can be read.
 * @CLUTTER_FEATURE_STAGE_STATIC: Set if stage size if fixed (i.e framebuffer)
 * @CLUTTER_FEATURE_STAGE_USER_RESIZE: Set if stage is able to be user resized.
 * @CLUTTER_FEATURE_STAGE_CURSOR: Set if stage has a graphical cursor.
 * @CLUTTER_FEATURE_SHADERS_GLSL: Set if the backend supports GLSL shaders.
 * @CLUTTER_FEATURE_OFFSCREEN: Set if the backend supports offscreen rendering.
 * @CLUTTER_FEATURE_STAGE_MULTIPLE: Set if multiple stages are supported.
 * @CLUTTER_FEATURE_SWAP_EVENTS: Set if the GLX_INTEL_swap_event is supported.
 *
 * Runtime flags indicating specific features available via Clutter window
 * sysytem and graphics backend.
 *
 * Since: 0.4
 */
    Feature.TEXTURE_NPOT           = (1 << 2);
    Feature.SYNC_TO_VBLANK         = (1 << 3);
    Feature.TEXTURE_YUV            = (1 << 4);
    Feature.TEXTURE_READ_PIXELS    = (1 << 5);
    Feature.STAGE_STATIC           = (1 << 6);
    Feature.STAGE_USER_RESIZE      = (1 << 7);
    Feature.STAGE_CURSOR           = (1 << 8);
    Feature.SHADERS_GLSL           = (1 << 9);
    Feature.OFFSCREEN              = (1 << 10);
    Feature.STAGE_MULTIPLE         = (1 << 11);
    Feature.SWAP_EVENTS            = (1 << 12);

    // static methods
    Feature.init = function() {
        Note.MISC("checking features");
        if (__features.features_set) { return true; }

        var context = Context._get_default();

        /* makes sure we have a GL context; if we have, this is a no-op */
        if (!context.backend.create_context()) {
            return false;
        }

        // XXX CSA UNIMPLEMENTED
        __features.flags = 0/*features_from_cogl(Cogl.get_features())*/ |
            context.backend.get_features();

        __features.features_set = true;

        Note.MISC("features checked");

        return true;
    };

/**
 * clutter_feature_available:
 * @feature: a #ClutterFeatureFlags
 *
 * Checks whether @feature is available.  @feature can be a logical
 * OR of #ClutterFeatureFlags.
 *
 * Return value: %TRUE if a feature is available
 *
 * Since: 0.1.1
 */
    Feature.available = function(feature) {
        console.assert(__features.features_set,
                       "Unable to check features.  "+
                       "Have you initialized Jutter?");
        return !!(__features.flags & feature);
    };

/**
 * clutter_feature_get_all:
 *
 * Returns all the supported features.
 *
 * Return value: a logical OR of all the supported features.
 *
 * Since: 0.1.1
 */
    Feature.get_all = function() {
        console.assert(__features.features_set,
                       "Unable to check features.  "+
                       "Have you initialized Jutter?");
        return __features.flags;
    };


    return Feature;
});

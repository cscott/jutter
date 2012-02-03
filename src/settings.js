/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false, window:false */
'use strict';
define([], function() {
/**
 * SECTION:clutter-settings
 * @Title: ClutterSettings
 * @Short_Description: Settings configuration
 *
 * Clutter depends on some settings to perform operations like detecting
 * multiple button press events, or font options to render text.
 *
 * Usually, Clutter will strive to use the platform's settings in order
 * to be as much integrated as possible. It is, however, possible to
 * change these settings on a per-application basis, by using the
 * #ClutterSettings singleton object and setting its properties. It is
 * also possible, for toolkit developers, to retrieve the settings from
 * the #ClutterSettings properties when implementing new UI elements,
 * for instance the default font name.
 *
 * #ClutterSettings is available since Clutter 1.4
 */

/**
 * ClutterSettings:
 *
 * <structname>ClutterSettings</structname> is an opaque structure whose
 * members cannot be directly accessed.
 *
 * Since: 1.4
 */
    var Settings = function() {
    };
    Settings.prototype = {
        parent_instance: null,

        backend: null,

        double_click_time: 250,
        double_click_distance: 5,

        dnd_drag_threshold: 8,

        resolution: -1.0,

        font_name: "Sans 12",

        xft_hinting: -1,
        xft_antialias: -1,
        xft_hint_style: null,
        xft_rgba: null,

        long_press_duration: 500,

        last_fontconfig_timestamp: 0,

        password_hint_time: 600,
    };
    var settings = null;
    Settings.get_default = function() {
        if (settings === null) {
            settings = new Settings();
        }
        return settings;
    };

    return Settings;
});

define([], function() {
    var PickMode = {
        INVALID: -1,
        NONE:     0,
        REACTIVE: 1,
        ALL:      2
    };
    Object.freeze(PickMode);

/**
 * ClutterGravity:
 * @CLUTTER_GRAVITY_NONE: Do not apply any gravity
 * @CLUTTER_GRAVITY_NORTH: Scale from topmost downwards
 * @CLUTTER_GRAVITY_NORTH_EAST: Scale from the top right corner
 * @CLUTTER_GRAVITY_EAST: Scale from the right side
 * @CLUTTER_GRAVITY_SOUTH_EAST: Scale from the bottom right corner
 * @CLUTTER_GRAVITY_SOUTH: Scale from the bottom upwards
 * @CLUTTER_GRAVITY_SOUTH_WEST: Scale from the bottom left corner
 * @CLUTTER_GRAVITY_WEST: Scale from the left side
 * @CLUTTER_GRAVITY_NORTH_WEST: Scale from the top left corner
 * @CLUTTER_GRAVITY_CENTER: Scale from the center.
 *
 * Gravity of the scaling operations. When a gravity different than
 * %CLUTTER_GRAVITY_NONE is used, an actor is scaled keeping the position
 * of the specified portion at the same coordinates.
 *
 * Since: 0.2
 */
    var Gravity = {
        NONE:       0,
        NORTH:      1,
        NORTH_EAST: 2,
        EAST:       3,
        SOUTH_EAST: 4,
        SOUTH:      5,
        SOUTH_WEST: 6,
        WEST:       7,
        NORTH_WEST: 8,
        CENTER:     9
    };
    Object.freeze(Gravity);

/**
 * ClutterRotateAxis:
 * @CLUTTER_X_AXIS: Rotate around the X axis
 * @CLUTTER_Y_AXIS: Rotate around the Y axis
 * @CLUTTER_Z_AXIS: Rotate around the Z axis
 *
 * Axis of a rotation.
 *
 * Since: 0.4
 */
    var RotateAxis = {
        X_AXIS: 0,
        Y_AXIS: 1,
        Z_AXIS: 2
    };
    Object.freeze(RotateAxis);

/**
 * ClutterRotateDirection:
 * @CLUTTER_ROTATE_CW: Clockwise rotation
 * @CLUTTER_ROTATE_CCW: Counter-clockwise rotation
 *
 * Direction of a rotation.
 *
 * Since: 0.4
 */
    var RotateDirection = {
        ROTATE_CW:  0,
        ROTATE_CCW: 1
    };
    Object.freeze(RotateDirection);

/**
 * ClutterRequestMode:
 * @CLUTTER_REQUEST_HEIGHT_FOR_WIDTH: Height for width requests
 * @CLUTTER_REQUEST_WIDTH_FOR_HEIGHT: Width for height requests
 *
 * Specifies the type of requests for a #ClutterActor.
 *
 * Since: 0.8
 */
    var RequestMode = {
        HEIGHT_FOR_WIDTH: 0,
        WIDTH_FOR_HEIGHT: 1
    };
    Object.freeze(RequestMode);

/**
 * ClutterAnimationMode:
 * @CLUTTER_CUSTOM_MODE: custom progress function
 * @CLUTTER_LINEAR: linear tweening
 * @CLUTTER_EASE_IN_QUAD: quadratic tweening
 * @CLUTTER_EASE_OUT_QUAD: quadratic tweening, inverse of
 *    %CLUTTER_EASE_IN_QUAD
 * @CLUTTER_EASE_IN_OUT_QUAD: quadratic tweening, combininig
 *    %CLUTTER_EASE_IN_QUAD and %CLUTTER_EASE_OUT_QUAD
 * @CLUTTER_EASE_IN_CUBIC: cubic tweening
 * @CLUTTER_EASE_OUT_CUBIC: cubic tweening, invers of
 *    %CLUTTER_EASE_IN_CUBIC
 * @CLUTTER_EASE_IN_OUT_CUBIC: cubic tweening, combining
 *    %CLUTTER_EASE_IN_CUBIC and %CLUTTER_EASE_OUT_CUBIC
 * @CLUTTER_EASE_IN_QUART: quartic tweening
 * @CLUTTER_EASE_OUT_QUART: quartic tweening, inverse of
 *    %CLUTTER_EASE_IN_QUART
 * @CLUTTER_EASE_IN_OUT_QUART: quartic tweening, combining
 *    %CLUTTER_EASE_IN_QUART and %CLUTTER_EASE_OUT_QUART
 * @CLUTTER_EASE_IN_QUINT: quintic tweening
 * @CLUTTER_EASE_OUT_QUINT: quintic tweening, inverse of
 *    %CLUTTER_EASE_IN_QUINT
 * @CLUTTER_EASE_IN_OUT_QUINT: fifth power tweening, combining
 *    %CLUTTER_EASE_IN_QUINT and %CLUTTER_EASE_OUT_QUINT
 * @CLUTTER_EASE_IN_SINE: sinusoidal tweening
 * @CLUTTER_EASE_OUT_SINE: sinusoidal tweening, inverse of
 *    %CLUTTER_EASE_IN_SINE
 * @CLUTTER_EASE_IN_OUT_SINE: sine wave tweening, combining
 *    %CLUTTER_EASE_IN_SINE and %CLUTTER_EASE_OUT_SINE
 * @CLUTTER_EASE_IN_EXPO: exponential tweening
 * @CLUTTER_EASE_OUT_EXPO: exponential tweening, inverse of
 *    %CLUTTER_EASE_IN_EXPO
 * @CLUTTER_EASE_IN_OUT_EXPO: exponential tweening, combining
 *    %CLUTTER_EASE_IN_EXPO and %CLUTTER_EASE_OUT_EXPO
 * @CLUTTER_EASE_IN_CIRC: circular tweening
 * @CLUTTER_EASE_OUT_CIRC: circular tweening, inverse of
 *    %CLUTTER_EASE_IN_CIRC
 * @CLUTTER_EASE_IN_OUT_CIRC: circular tweening, combining
 *    %CLUTTER_EASE_IN_CIRC and %CLUTTER_EASE_OUT_CIRC
 * @CLUTTER_EASE_IN_ELASTIC: elastic tweening, with offshoot on start
 * @CLUTTER_EASE_OUT_ELASTIC: elastic tweening, with offshoot on end
 * @CLUTTER_EASE_IN_OUT_ELASTIC: elastic tweening with offshoot on both ends
 * @CLUTTER_EASE_IN_BACK: overshooting cubic tweening, with
 *   backtracking on start
 * @CLUTTER_EASE_OUT_BACK: overshooting cubic tweening, with
 *   backtracking on end
 * @CLUTTER_EASE_IN_OUT_BACK: overshooting cubic tweening, with
 *   backtracking on both ends
 * @CLUTTER_EASE_IN_BOUNCE: exponentially decaying parabolic (bounce)
 *   tweening, with bounce on start
 * @CLUTTER_EASE_OUT_BOUNCE: exponentially decaying parabolic (bounce)
 *   tweening, with bounce on end
 * @CLUTTER_EASE_IN_OUT_BOUNCE: exponentially decaying parabolic (bounce)
 *   tweening, with bounce on both ends
 * @CLUTTER_ANIMATION_LAST: last animation mode, used as a guard for
 *   registered global alpha functions
 *
 * The animation modes used by #ClutterAlpha and #ClutterAnimation. This
 * enumeration can be expanded in later versions of Clutter. See the
 * #ClutterAlpha documentation for a graph of all the animation modes.
 *
 * Every global alpha function registered using clutter_alpha_register_func()
 * or clutter_alpha_register_closure() will have a logical id greater than
 * %CLUTTER_ANIMATION_LAST.
 *
 * Since: 1.0
 */
    var AnimationMode = {
        CUSTOM_MODE:      0,

        /* linear */
        LINEAR:           1,

        /* quadratic */
        EASE_IN_QUAD:     2,
        EASE_OUT_QUAD:    3,
        EASE_IN_OUT_QUAD: 4,

        /* cubic */
        EASE_IN_CUBIC:    5,
        EASE_OUT_CUBIC:   6,
        EASE_IN_OUT_CUBIC:7,

        /* quartic */
        EASE_IN_QUART:    8,
        EASE_OUT_QUART:   9,
        EASE_IN_OUT_QUART:10,

        /* quintic */
        EASE_IN_QUINT:    11,
        EASE_OUT_QUINT:   12,
        EASE_IN_OUT_QUINT:13,

        /* sinusoidal */
        EASE_IN_SINE:     14,
        EASE_OUT_SINE:    15,
        EASE_IN_OUT_SINE: 16,

        /* exponential */
        EASE_IN_EXPO:     17,
        EASE_OUT_EXPO:    18,
        EASE_IN_OUT_EXPO: 19,

        /* circular */
        EASE_IN_CIRC:     20,
        EASE_OUT_CIRC:    21,
        EASE_IN_OUT_CIRC: 22,

        /* elastic */
        EASE_IN_ELASTIC:  23,
        EASE_OUT_ELASTIC: 24,
        EASE_IN_OUT_ELASTIC:25,

        /* overshooting cubic */
        EASE_IN_BACK:     26,
        EASE_OUT_BACK:    27,
        EASE_IN_OUT_BACK: 28,

        /* exponentially decaying parabolic */
        EASE_IN_BOUNCE:   29,
        EASE_OUT_BOUNCE:  30,
        EASE_IN_OUT_BOUNCE:31,

        /* guard, before registered alpha functions */
        ANIMATION_LAST:   32
    };
    Object.freeze(AnimationMode);

/**
 * ClutterFontFlags:
 * @CLUTTER_FONT_MIPMAPPING: Set to use mipmaps for the glyph cache textures.
 * @CLUTTER_FONT_HINTING: Set to enable hinting on the glyphs.
 *
 * Runtime flags to change the font quality. To be used with
 * clutter_set_font_flags().
 *
 * Since: 1.0
 */
    var FontFlags = {
        MIPMAPPING: (1 << 0),
        HINTING:    (1 << 1)
    };
    Object.freeze(FontFlags);

/**
 * ClutterTextDirection:
 * @CLUTTER_TEXT_DIRECTION_DEFAULT: Use the default setting, as returned
 *   by clutter_get_default_text_direction()
 * @CLUTTER_TEXT_DIRECTION_LTR: Use left-to-right text direction
 * @CLUTTER_TEXT_DIRECTION_RTL: Use right-to-left text direction
 *
 * The text direction to be used by #ClutterActor<!-- -->s
 *
 * Since: 1.2
 */
    var TextDirection = {
        DEFAULT: 0,
        LTR: 1,
        RTL: 2
    };
    Object.freeze(TextDirection);

    // XXX CSA XXX and more...

/**
 * ClutterActorAlign:
 * @CLUTTER_ACTOR_ALIGN_FILL: Stretch to cover the whole allocated space
 * @CLUTTER_ACTOR_ALIGN_START: Snap to left or top side, leaving space
 *   to the right or bottom. For horizontal layouts, in right-to-left
 *   locales this should be reversed.
 * @CLUTTER_ACTOR_ALIGN_CENTER: Center the actor inside the allocation
 * @CLUTTER_ACTOR_ALIGN_END: Snap to right or bottom side, leaving space
 *   to the left or top. For horizontal layouts, in right-to-left locales
 *   this should be reversed.
 *
 * Controls how a #ClutterActor should align itself inside the extra space
 * assigned to it during the allocation.
 *
 * Alignment only matters if the allocated space given to an actor is
 * bigger than its natural size; for example, when the #ClutterActor:x-expand
 * or the #ClutterActor:y-expand properties of #ClutterActor are set to %TRUE.
 *
 * Since: 1.10
 */
    var ActorAlign = {
        FILL:   0,
        START:  1,
        CENTER: 2,
        END:    3
    };
    Object.freeze(ActorAlign);

    return {
        PickMode: PickMode,
        Gravity: Gravity,
        RotateAxis: RotateAxis,
        RotateDirection: RotateDirection,
        RequestMode: RequestMode,
        AnimationMode: AnimationMode,
        FontFlags: FontFlags,
        TextDirection: TextDirection,
        ActorAlign: ActorAlign
    };
});

define([], function() {
    var Enums = {};

    Enums.PickMode = {
        INVALID: -1,
        NONE:     0,
        REACTIVE: 1,
        ALL:      2
    };

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
    Enums.Gravity = {
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
    Enums.RotateAxis = {
        X_AXIS: 0,
        Y_AXIS: 1,
        Z_AXIS: 2
    };

/**
 * ClutterRotateDirection:
 * @CLUTTER_ROTATE_CW: Clockwise rotation
 * @CLUTTER_ROTATE_CCW: Counter-clockwise rotation
 *
 * Direction of a rotation.
 *
 * Since: 0.4
 */
    Enums.RotateDirection = {
        ROTATE_CW:  0,
        ROTATE_CCW: 1
    };

/**
 * ClutterRequestMode:
 * @CLUTTER_REQUEST_HEIGHT_FOR_WIDTH: Height for width requests
 * @CLUTTER_REQUEST_WIDTH_FOR_HEIGHT: Width for height requests
 *
 * Specifies the type of requests for a #ClutterActor.
 *
 * Since: 0.8
 */
    Enums.RequestMode = {
        HEIGHT_FOR_WIDTH: 0,
        WIDTH_FOR_HEIGHT: 1
    };

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
    Enums.AnimationMode = {
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
    Enums.FontFlags = {
        MIPMAPPING: (1 << 0),
        HINTING:    (1 << 1)
    };

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
    Enums.TextDirection = {
        DEFAULT: 0,
        LTR: 1,
        RTL: 2
    };

/**
 * ClutterShaderType:
 * @CLUTTER_VERTEX_SHADER: a vertex shader
 * @CLUTTER_FRAGMENT_SHADER: a fragment shader
 *
 * The type of GLSL shader program
 *
 * Since: 1.4
 */
    Enums.ShaderType = {
        VERTEX_SHADER: 0,
        FRAGMENT_SHADER: 1
    };

/**
 * ClutterModifierType:
 * @CLUTTER_SHIFT_MASK: Mask applied by the Shift key
 * @CLUTTER_LOCK_MASK: Mask applied by the Caps Lock key
 * @CLUTTER_CONTROL_MASK: Mask applied by the Control key
 * @CLUTTER_MOD1_MASK: Mask applied by the first Mod key
 * @CLUTTER_MOD2_MASK: Mask applied by the second Mod key
 * @CLUTTER_MOD3_MASK: Mask applied by the third Mod key
 * @CLUTTER_MOD4_MASK: Mask applied by the fourth Mod key
 * @CLUTTER_MOD5_MASK: Mask applied by the fifth Mod key
 * @CLUTTER_BUTTON1_MASK: Mask applied by the first pointer button
 * @CLUTTER_BUTTON2_MASK: Mask applied by the second pointer button
 * @CLUTTER_BUTTON3_MASK: Mask applied by the third pointer button
 * @CLUTTER_BUTTON4_MASK: Mask applied by the fourth pointer button
 * @CLUTTER_BUTTON5_MASK: Mask applied by the fifth pointer button
 * @CLUTTER_SUPER_MASK: Mask applied by the Super key
 * @CLUTTER_HYPER_MASK: Mask applied by the Hyper key
 * @CLUTTER_META_MASK: Mask applied by the Meta key
 * @CLUTTER_RELEASE_MASK: Mask applied during release
 * @CLUTTER_MODIFIER_MASK: A mask covering all modifier types
 *
 * Masks applied to a #ClutterEvent by modifiers.
 *
 * Note that Clutter may add internal values to events which include
 * reserved values such as %CLUTTER_MODIFIER_RESERVED_13_MASK.  Your code
 * should preserve and ignore them.  You can use %CLUTTER_MODIFIER_MASK to
 * remove all reserved values.
 *
 * Since: 0.4
 */
    Enums.ModifierType = {
        SHIFT_MASK:     1 << 0,
        LOCK_MASK:      1 << 1,
        CONTROL_MASK:   1 << 2,
        MOD1_MASK:      1 << 3,
        MOD2_MASK:      1 << 4,
        MOD3_MASK:      1 << 5,
        MOD4_MASK:      1 << 6,
        MOD5_MASK:      1 << 7,
        BUTTON1_MASK:   1 << 8,
        BUTTON2_MASK:   1 << 9,
        BUTTON3_MASK:   1 << 10,
        BUTTON4_MASK:   1 << 11,
        BUTTON5_MASK:   1 << 12,

        MODIFIER_RESERVED_13_MASK:   1 << 13,
        MODIFIER_RESERVED_14_MASK:   1 << 14,
        MODIFIER_RESERVED_15_MASK:   1 << 15,
        MODIFIER_RESERVED_16_MASK:   1 << 16,
        MODIFIER_RESERVED_17_MASK:   1 << 17,
        MODIFIER_RESERVED_18_MASK:   1 << 18,
        MODIFIER_RESERVED_19_MASK:   1 << 19,
        MODIFIER_RESERVED_20_MASK:   1 << 20,
        MODIFIER_RESERVED_21_MASK:   1 << 21,
        MODIFIER_RESERVED_22_MASK:   1 << 22,
        MODIFIER_RESERVED_23_MASK:   1 << 23,
        MODIFIER_RESERVED_24_MASK:   1 << 24,
        MODIFIER_RESERVED_25_MASK:   1 << 25,

        SUPER_MASK:     1 << 26,
        HYPER_MASK:     1 << 27,
        META_MASK:      1 << 28,

        MODIFIER_RESERVED_29_MASK:   1 << 29,

        RELEASE_MASK:   1 << 30,

        /* Combination of CLUTTER_SHIFT_MASK..CLUTTER_BUTTON5_MASK + CLUTTER_SUPER_MASK
           + CLUTTER_HYPER_MASK + CLUTTER_META_MASK + CLUTTER_RELEASE_MASK */
        MODIFIER_MASK:  0x5c001fff
    };

/**
 * ClutterActorFlags:
 * @CLUTTER_ACTOR_MAPPED: the actor will be painted (is visible, and inside
 *   a toplevel, and all parents visible)
 * @CLUTTER_ACTOR_REALIZED: the resources associated to the actor have been
 *   allocated
 * @CLUTTER_ACTOR_REACTIVE: the actor 'reacts' to mouse events emmitting event
 *   signals
 * @CLUTTER_ACTOR_VISIBLE: the actor has been shown by the application program
 * @CLUTTER_ACTOR_NO_LAYOUT: the actor provides an explicit layout management
 *   policy for its children; this flag will prevent Clutter from automatic
 *   queueing of relayout and will defer all layouting to the actor itself
 *
 * Flags used to signal the state of an actor.
 */
    Enums.ActorFlags = {
        MAPPED:     1 << 1,
        REALIZED:   1 << 2,
        REACTIVE:   1 << 3,
        VISIBLE:    1 << 4,
        NO_LAYOUT:  1 << 5
    };

/**
 * ClutterOffscreenRedirect:
 * @CLUTTER_OFFSCREEN_REDIRECT_AUTOMATIC_FOR_OPACITY: Only redirect
 *   the actor if it is semi-transparent and its has_overlaps()
 *   virtual returns %TRUE. This is the default.
 * @CLUTTER_OFFSCREEN_REDIRECT_ALWAYS: Always redirect the actor to an
 *   offscreen buffer even if it is fully opaque.
 *
 * Possible flags to pass to clutter_actor_set_offscreen_redirect().
 *
 * Since: 1.8
 */
    Enums.OffscreenRedirect = {
        AUTOMATIC_FOR_OPACITY:  1<<0,
        ALWAYS:  1<<1
    };

/**
 * ClutterAllocationFlags:
 * @CLUTTER_ALLOCATION_NONE: No flag set
 * @CLUTTER_ABSOLUTE_ORIGIN_CHANGED: Whether the absolute origin of the
 *   actor has changed; this implies that any ancestor of the actor has
 *   been moved.
 * @CLUTTER_DELEGATE_LAYOUT: Whether the allocation should be delegated
 *   to the #ClutterLayoutManager instance stored inside the
 *   #ClutterActor:layout-manager property of #ClutterActor. This flag
 *   should only be used if you are subclassing #ClutterActor and
 *   overriding the #ClutterActorClass.allocate() virtual function, but
 *   you wish to use the default implementation of the virtual function
 *   inside #ClutterActor. Added in Clutter 1.10.
 *
 * Flags passed to the #ClutterActorClass.allocate() virtual function
 * and to the clutter_actor_allocate() function.
 *
 * Since: 1.0
 */
    Enums.AllocationFlags = {
        NONE:          0,
        ABSOLUTE_ORIGIN_CHANGED:  1 << 1,
        DELEGATE_LAYOUT:          1 << 2
    };

/**
 * ClutterAlignAxis:
 * @CLUTTER_ALIGN_X_AXIS: Maintain the alignment on the X axis
 * @CLUTTER_ALIGN_Y_AXIS: Maintain the alignment on the Y axis
 * @CLUTTER_ALIGN_BOTH: Maintain the alignment on both the X and Y axis
 *
 * Specifies the axis on which #ClutterAlignConstraint should maintain
 * the alignment.
 *
 * Since: 1.4
 */
    Enums.AlignAxis = {
        X_AXIS: 0,
        Y_AXIS: 1,
        BOTH:   2
    };

/**
 * ClutterInterpolation:
 * @CLUTTER_INTERPOLATION_LINEAR: linear interpolation
 * @CLUTTER_INTERPOLATION_CUBIC: cubic interpolation
 *
 * The mode of interpolation between key frames
 *
 * Since: 1.2
 */
    Enums.Interpolation = {
        LINEAR: 0,
        CUBIC:  1
    };

/**
 * ClutterBinAlignment:
 * @CLUTTER_BIN_ALIGNMENT_FIXED: Fixed position alignment; the
 *   #ClutterBinLayout will honour the fixed position provided
 *   by the actors themselves when allocating them
 * @CLUTTER_BIN_ALIGNMENT_FILL: Fill the allocation size
 * @CLUTTER_BIN_ALIGNMENT_START: Position the actors at the top
 *   or left side of the container, depending on the axis
 * @CLUTTER_BIN_ALIGNMENT_END: Position the actors at the bottom
 *   or right side of the container, depending on the axis
 * @CLUTTER_BIN_ALIGNMENT_CENTER: Position the actors at the
 *   center of the container, depending on the axis
 *
 * The alignment policies available on each axis for #ClutterBinLayout
 *
 * Since: 1.2
 */
    Enums.BinAlignment = {
        FIXED: 0,
        FILL:  1,
        START: 2,
        END:   3,
        CENTER:4
    };

/**
 * ClutterBindCoordinate:
 * @CLUTTER_BIND_X: Bind the X coordinate
 * @CLUTTER_BIND_Y: Bind the Y coordinate
 * @CLUTTER_BIND_WIDTH: Bind the width
 * @CLUTTER_BIND_HEIGHT: Bind the height
 * @CLUTTER_BIND_POSITION: Equivalent to to %CLUTTER_BIND_X and
 *   %CLUTTER_BIND_Y
 * @CLUTTER_BIND_SIZE: Equivalent to %CLUTTER_BIND_WIDTH and
 *   %CLUTTER_BIND_HEIGHT
 *
 * Specifies which property should be used in a binding
 *
 * Since: 1.4
 */
    Enums.BindCoordinate = {
        X:        0,
        Y:        1,
        WIDTH:    2,
        HEIGHT:   3,
        POSITION: 4,
        SIZE:     5
    };

/**
 * ClutterEffectPaintFlags:
 * @CLUTTER_EFFECT_PAINT_ACTOR_DIRTY: The actor or one of its children
 *   has queued a redraw before this paint. This implies that the effect
 *   should call clutter_actor_continue_paint() to chain to the next
 *   effect and can not cache any results from a previous paint.
 *
 * Flags passed to the ‘paint’ or ‘pick’ method of #ClutterEffect.
 */
    Enums.EffectPaintFlags = {
        ACTOR_DIRTY:  (1 << 0)
    };

/**
 * ClutterBoxAlignment:
 * @CLUTTER_BOX_ALIGNMENT_START: Align the child to the top or to
 *   to the left, depending on the used axis
 * @CLUTTER_BOX_ALIGNMENT_CENTER: Align the child to the center
 * @CLUTTER_BOX_ALIGNMENT_END: Align the child to the bottom or to
 *   the right, depending on the used axis
 *
 * The alignment policies available on each axis of the #ClutterBoxLayout
 *
 * Since: 1.2
 */
    Enums.BoxAlignment = {
        START:  0,
        END:    1,
        CENTER: 2
    };

/**
 * ClutterLongPressState:
 * @CLUTTER_LONG_PRESS_QUERY: Queries the action whether it supports
 *   long presses
 * @CLUTTER_LONG_PRESS_ACTIVATE: Activates the action on a long press
 * @CLUTTER_LONG_PRESS_CANCEL: The long press was cancelled
 *
 * The states for the #ClutterClikAction::long-press signal.
 *
 * Since: 1.8
 */
    Enums.LongPressState = {
        QUERY:    0,
        ACTIVATE: 1,
        CANCEL:   2
    };

    // CSA: Skipping StaticColor

    // XXX CSA XXX event related enums (moved to event.js)

/**
 * ClutterStageState:
 * @CLUTTER_STAGE_STATE_FULLSCREEN: Fullscreen mask
 * @CLUTTER_STAGE_STATE_OFFSCREEN: Offscreen mask (deprecated)
 * @CLUTTER_STAGE_STATE_ACTIVATED: Activated mask
 *
 * Stage state masks, used by the #ClutterEvent of type %CLUTTER_STAGE_STATE.
 *
 * Since: 0.4
 */
    Enums.StageState = {
        FULLSCREEN:        (1 << 1),
        OFFSCREEN:         (1 << 2),
        ACTIVATED:         (1 << 3)
    };

    // CSA: Feature Flags moved to feature.js

/**
 * ClutterFlowOrientation:
 * @CLUTTER_FLOW_HORIZONTAL: Arrange the children of the flow layout
 *   horizontally first
 * @CLUTTER_FLOW_VERTICAL: Arrange the children of the flow layout
 *   vertically first
 *
 * The direction of the arrangement of the children inside
 * a #ClutterFlowLayout
 *
 * Since: 1.2
 */
    Enums.FlowOrientation = {
        HORIZONTAL: 0,
        VERTICAL:   1
    };

/**
 * ClutterInputDeviceType:
 * @CLUTTER_POINTER_DEVICE: A pointer device
 * @CLUTTER_KEYBOARD_DEVICE: A keyboard device
 * @CLUTTER_EXTENSION_DEVICE: A generic extension device
 * @CLUTTER_JOYSTICK_DEVICE: A joystick device
 * @CLUTTER_TABLET_DEVICE: A tablet device
 * @CLUTTER_TOUCHPAD_DEVICE: A touchpad device
 * @CLUTTER_TOUCHSCREEN_DEVICE: A touch screen device
 * @CLUTTER_PEN_DEVICE: A pen device
 * @CLUTTER_ERASER_DEVICE: An eraser device
 * @CLUTTER_CURSOR_DEVICE: A cursor device
 * @CLUTTER_N_DEVICE_TYPES: The number of device types
 *
 * The types of input devices available.
 *
 * The #ClutterInputDeviceType enumeration can be extended at later
 * date; not every platform supports every input device type.
 *
 * Since: 1.0
 */
    Enums.InputDeviceType = {
        POINTER_DEVICE:     0,
        KEYBOARD_DEVICE:    1,
        EXTENSION_DEVICE:   2,
        JOYSTICK_DEVICE:    3,
        TABLET_DEVICE:      4,
        TOUCHPAD_DEVICE:    5,
        TOUCHSCREEN_DEVICE: 6,
        PEN_DEVICE:         7,
        ERASER_DEVICE:      8,
        CURSOR_DEVICE:      9,

        N_DEVICE_TYPES:    10
    };

/**
 * ClutterInputMode:
 * @CLUTTER_INPUT_MODE_MASTER: A master, virtual device
 * @CLUTTER_INPUT_MODE_SLAVE: A slave, physical device, attached to
 *   a master device
 * @CLUTTER_INPUT_MODE_FLOATING: A slave, physical device, not attached
 *   to a master device
 *
 * The mode for input devices available.
 *
 * Since: 1.6
 */
    Enums.InputMode = {
        MASTER:   0,
        SLAVE:    1,
        FLOATING: 2
    };

/**
 * ClutterInputAxis:
 * @CLUTTER_INPUT_AXIS_IGNORE: Unused axis
 * @CLUTTER_INPUT_AXIS_X: The position on the X axis
 * @CLUTTER_INPUT_AXIS_Y: The position of the Y axis
 * @CLUTTER_INPUT_AXIS_PRESSURE: The pressure information
 * @CLUTTER_INPUT_AXIS_XTILT: The tilt on the X axis
 * @CLUTTER_INPUT_AXIS_YTILT: The tile on the Y axis
 * @CLUTTER_INPUT_AXIS_WHEEL: A wheel
 *
 * The type of axes Clutter recognizes on a #ClutterInputDevice
 *
 * Since: 1.6
 */
    Enums.InputAxis = {
        IGNORE:   0,
        X:        1,
        Y:        2,
        PRESSURE: 3,
        XTILT:    4,
        YTILT:    5,
        WHEEL:    6
    };

/**
 * ClutterSnapEdge:
 * @CLUTTER_SNAP_EDGE_TOP: the top edge
 * @CLUTTER_SNAP_EDGE_RIGHT: the right edge
 * @CLUTTER_SNAP_EDGE_BOTTOM: the bottom edge
 * @CLUTTER_SNAP_EDGE_LEFT: the left edge
 *
 * The edge to snap
 *
 * Since: 1.6
 */
    Enums.SnapEdge = {
        TOP:    0,
        RIGHT:  1,
        BOTTOM: 2,
        LEFT:   3
    };

/**
 * ClutterPickMode:
 * @CLUTTER_PICK_NONE: Do not paint any actor
 * @CLUTTER_PICK_REACTIVE: Paint only the reactive actors
 * @CLUTTER_PICK_ALL: Paint all actors
 *
 * Controls the paint cycle of the scene graph when in pick mode
 *
 * Since: 1.0
 */
    Enums.PickMode = {
        NONE:     0,
        REACTIVE: 1,
        ALL:      2
    };

/**
 * ClutterSwipeDirection:
 * @CLUTTER_SWIPE_DIRECTION_UP: Upwards swipe gesture
 * @CLUTTER_SWIPE_DIRECTION_DOWN: Downwards swipe gesture
 * @CLUTTER_SWIPE_DIRECTION_LEFT: Leftwards swipe gesture
 * @CLUTTER_SWIPE_DIRECTION_RIGHT: Rightwards swipe gesture
 *
 * The main direction of the swipe gesture
 *
 * Since: 1.8
 */
    Enums.SwipeDirection = {
        UP:     1 << 0,
        DOWN:   1 << 1,
        LEFT:   1 << 2,
        RIGHT:  1 << 3
    };

/**
 * ClutterTableAlignment:
 * @CLUTTER_TABLE_ALIGNMENT_START: Align the child to the top or to the
 *   left of a cell in the table, depending on the axis
 * @CLUTTER_TABLE_ALIGNMENT_CENTER: Align the child to the center of
 *   a cell in the table
 * @CLUTTER_TABLE_ALIGNMENT_END: Align the child to the bottom or to the
 *   right of a cell in the table, depending on the axis
 *
 * The alignment policies available on each axis of the #ClutterTableLayout
 *
 * Since: 1.4
 */
    Enums.TableAlignment = {
        START:  0,
        CENTER: 1,
        END:    2
    };

/**
 * ClutterTextureFlags:
 * @CLUTTER_TEXTURE_NONE: No flags
 * @CLUTTER_TEXTURE_RGB_FLAG_BGR: FIXME
 * @CLUTTER_TEXTURE_RGB_FLAG_PREMULT: FIXME
 * @CLUTTER_TEXTURE_YUV_FLAG_YUV2: FIXME
 *
 * Flags for clutter_texture_set_from_rgb_data() and
 * clutter_texture_set_from_yuv_data().
 *
 * Since: 0.4
 */
    Enums.TextureFlags = {
        NONE:              0,
        RGB_FLAG_BGR:      1 << 1,
        RGB_FLAG_PREMULT:  1 << 2, /* FIXME: not handled */
        YUV_FLAG_YUV2:     1 << 3

        /* FIXME: add compressed types ? */
    };

/**
 * ClutterTextureQuality:
 * @CLUTTER_TEXTURE_QUALITY_LOW: fastest rendering will use nearest neighbour
 *   interpolation when rendering. good setting.
 * @CLUTTER_TEXTURE_QUALITY_MEDIUM: higher quality rendering without using
 *   extra resources.
 * @CLUTTER_TEXTURE_QUALITY_HIGH: render the texture with the best quality
 *   available using extra memory.
 *
 * Enumaration controlling the texture quality.
 *
 * Since: 0.8
 */
    Enums.TextureQuality = {
        LOW:    0,
        MEDIUM: 1,
        HIGH:   2
    };

/**
 * ClutterTimelineDirection:
 * @CLUTTER_TIMELINE_FORWARD: forward direction for a timeline
 * @CLUTTER_TIMELINE_BACKWARD: backward direction for a timeline
 *
 * The direction of a #ClutterTimeline
 *
 * Since: 0.6
 */
    Enums.TimelineDirection = {
        FORWARD:  0,
        BACKWARD: 1
    };

/**
 * ClutterUnitType:
 * @CLUTTER_UNIT_PIXEL: Unit expressed in pixels (with subpixel precision)
 * @CLUTTER_UNIT_EM: Unit expressed in em
 * @CLUTTER_UNIT_MM: Unit expressed in millimeters
 * @CLUTTER_UNIT_POINT: Unit expressed in points
 * @CLUTTER_UNIT_CM: Unit expressed in centimeters
 *
 * The type of unit in which a value is expressed
 *
 * This enumeration might be expanded at later date
 *
 * Since: 1.0
 */
Enums.UnitType = { /*< prefix=CLUTTER_UNIT >*/
    PIXEL: 0,
    EM:    1,
    MM:    2,
    POINT: 3,
    CM:    4
};

/**
 * ClutterPathNodeType:
 * @CLUTTER_PATH_MOVE_TO: jump to the given position
 * @CLUTTER_PATH_LINE_TO: create a line from the last node to the
 *   given position
 * @CLUTTER_PATH_CURVE_TO: bezier curve using the last position and
 *   three control points.
 * @CLUTTER_PATH_CLOSE: create a line from the last node to the last
 *   %CLUTTER_PATH_MOVE_TO node.
 * @CLUTTER_PATH_REL_MOVE_TO: same as %CLUTTER_PATH_MOVE_TO but with
 *   coordinates relative to the last node.
 * @CLUTTER_PATH_REL_LINE_TO: same as %CLUTTER_PATH_LINE_TO but with
 *   coordinates relative to the last node.
 * @CLUTTER_PATH_REL_CURVE_TO: same as %CLUTTER_PATH_CURVE_TO but with
 *   coordinates relative to the last node.
 *
 * Types of nodes in a #ClutterPath.
 *
 * Since: 1.0
 */
    Enums.PathNodeType = {
        MOVE_TO:       0,
        LINE_TO:       1,
        CURVE_TO:      2,
        CLOSE:         3,
        RELATIVE:     32
    };
    Enums.PathNodeType.REL_MOVE_TO = Enums.PathNodeType.MOVE_TO |
        Enums.PathNodeType.RELATIVE;
    Enums.PathNodeType.REL_LINE_TO = Enums.PathNodeType.LINE_TO |
        Enums.PathNodeType.RELATIVE;
    Enums.PathNodeType.REL_CURVE_TO= Enums.PathNodeType.CURVE_TO |
        Enums.PathNodeType.RELATIVE;

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
    Enums.ActorAlign = {
        FILL:   0,
        START:  1,
        CENTER: 2,
        END:    3
    };

    // freeze all enumerations so that they are treated as constants
    var e;
    for (e in Enums) {
        if (Enums.hasOwnProperty(e)) {
            Object.freeze(Enums[e]);
        }
    }

    return Enums;
});

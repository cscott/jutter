define(["./actor", "./fixed-layout", "./signals"], function(Actor, FixedLayout, Signals) {

    var PRIVATE = "_group_private";
/**
 * SECTION:clutter-group
 * @short_description: A fixed layout container
 *
 * A #ClutterGroup is an Actor which contains multiple child actors positioned
 * relative to the #ClutterGroup position. Other operations such as scaling,
 * rotating and clipping of the group will apply to the child actors.
 *
 * A #ClutterGroup's size is defined by the size and position of its children;
 * it will be the smallest non-negative size that covers the right and bottom
 * edges of all of its children.
 *
 * Setting the size on a Group using #ClutterActor methods like
 * clutter_actor_set_size() will override the natural size of the Group,
 * however this will not affect the size of the children and they may still
 * be painted outside of the allocation of the group. One way to constrain
 * the visible area of a #ClutterGroup to a specified allocation is to
 * explicitly set the size of the #ClutterGroup and then use the
 * #ClutterActor:clip-to-allocation property.
 *
 * Deprecated: 1.10: Use #ClutterActor instead.
 */
    var Group = function() {
        this._init();
    };
    Group.prototype = Object.create(Actor.prototype, {
        _init: {
            value: function() {
                Actor.prototype._init.call(this); // superclass init
                this[PRIVATE] = {};
                this[PRIVATE].layout = new FixedLayout();
                this.layout_manager = this[PRIVATE].layout;
            }
        },
        real_get_preferred_width: {
            value: function(for_height) {
                return this[PRIVATE].layout.get_preferred_width(
                    this, for_height);
            }
        },
        real_get_preferred_height: {
            value: function(for_width) {
                return this[PRIVATE].layout.get_preferred_height(
                    this, for_width);
            }
        },
        real_allocate: {
            value: function() {
                console.assert(false); // unimplemented
            }
        },
        real_paint: {
            value: function() {
                console.assert(false); // unimplemented
            }
        },
        real_pick: {
            value: function() {
                console.assert(false); // unimplemented
            }
        },
        real_get_paint_volume: {
            value: function() {
                console.assert(false); // unimplemented
            }
        },
    });
    Signals.register(Group.prototype, {
        paint: {
            closure: Group.prototype.real_paint
        },
        pick: {
            closure: Group.prototype.real_pick
        },
        allocate: {
            closure: Group.prototype.real_allocate
        },
        'get-preferred-width': {
            closure: Group.prototype.real_get_preferred_width
        },
        'get-preferred-height': {
            closure: Group.prototype.real_get_preferred_height
        },
        'get-paint-volume': {
            closure: Group.prototype.real_get_paint_volume
        }
    });
    return Group;
});

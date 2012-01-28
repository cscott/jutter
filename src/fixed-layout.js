/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./layout-manager"], function(LayoutManager) {

/**
 * SECTION:clutter-fixed-layout
 * @short_description: A fixed layout manager
 *
 * #ClutterFixedLayout is a layout manager implementing the same
 * layout policies as #ClutterGroup.
 *
 * #ClutterFixedLayout is available since Clutter 1.2
 */
    var FixedLayout = function() {
        this._init();
    };
    FixedLayout.prototype = Object.create(LayoutManager.prototype, {
        _init: {
            value: function() {
                LayoutManager.prototype._init.call(this); // superclass init
                this._container = null;
            }
        },
        get_preferred_width: {
            value: function(actor, for_height) {
                var min_right = 0;
                var natural_right = 0;
                var child;
                var child_x, child_min, child_natural;
                var r;

                for (child = actor.first_child;
                     child;
                     child = child.next_sibling) {
                    child_x = child.x;

                    r = child.get_preferred_size();
                    child_min = r.min_width;
                    child_natural = r.natural_width;

                    if (child_x + child_min > min_right) {
                        min_right = child_x + child_min;
                    }

                    if (child_x + child_natural > natural_right) {
                        natural_right = child_x + child_natural;
                    }
                }

                return {
                    min_width: min_right,
                    natural_width: natural_right
                };
            }
        },
        get_preferred_height: {
            value: function(actor, for_width) {
                var min_bottom = 0;
                var natural_bottom = 0;
                var child;
                var child_y, child_min, child_natural;
                var r;

                for (child = actor.first_child;
                     child;
                     child = child.next_sibling) {
                    child_y = child.y;

                    r = child.get_preferred_size();
                    child_min = r.min_height;
                    child_natural = r.natural_height;

                    if (child_y + child_min > min_bottom) {
                        min_bottom = child_y + child_min;
                    }

                    if (child_y + child_natural > natural_bottom) {
                        natural_bottom = child_y + child_natural;
                    }
                }

                return {
                    min_height: min_bottom,
                    natural_height: natural_bottom
                };
            }
        },
        allocate: {
            value: function(actor, allocation, flags) {
                // XXX CSA what do I do with 'allocation'?
                // XXX CSA should I return a value?
                var child;
                for (child = actor.first_child;
                     child;
                     child = child.next_sibling) {
                    child.allocate_preferred_size(flags);
                }
            }
        },
        container: {
            get: function() { return this._container; },
            set: function(container) {
                if (container) {
                    this._container = container;
                    /* signal Clutter that we don't impose any layout on
                     * our children, so we can shave off some relayout
                     * operations
                     */
                    container.no_layout = true;
                } else {
                    var old_container = this._container;
                    if (old_container) {
                        old_container.no_layout = false;
                    }
                    this._container = null;
                }
                // Chain to superclass.
                Object.getOwnPropertyDescriptor(
                    LayoutManager.prototype, 'container').set.call(
                        this, container);
            }
        }
    });

    return FixedLayout;
});

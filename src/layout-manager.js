/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./child-meta", "./layout-meta", "./note", "./signals"], function(Actor, ChildMeta, LayoutMeta, Note, Signals) {
    var QUARK_LAYOUT_META = 'clutter-layout-manager-child-meta';
    var QUARK_LAYOUT_ALPHA = 'clutter-layout-manager-alpha';

    var WARN_NOT_IMPLEMENTED = function(manager, what) {
        console.warn("This layout manager does not implement the "+
                     what+" method", manager);
    };

    var LayoutManager = function() {
        this._init();
    };
    LayoutManager.prototype = {
        _init: function() {
        },

        freeze_layout_change: function() {
            Note.LAYOUT("Freezing changes for manager", this);
            var is_frozen = this.freeze_change || 0;
            this.freeze_change = is_frozen + 1;
        },

        thaw_layout_change: function() {
            if (!('freeze_change' in this)) {
                console.error("Mismatched thaw; you have to call "+
                              "freeze_layout_change() prior to calling "+
                              "thaw_layout_change()");
                return;
            }
            var level = this.freeze_change;
            console.assert(level > 0);
            Note.LAYOUT("Thawing changes for manager", this);
            level -= 1;
            if (level === 0) {
                delete this.freeze_change;
            } else {
                this.freeze_change = level;
            }
        },

/**
 * clutter_layout_manager_get_preferred_width:
 * @manager: a #ClutterLayoutManager
 * @container: the #ClutterContainer using @manager
 * @for_height: the height for which the width should be computed, or -1
 * @min_width_p: (out) (allow-none): return location for the minimum width
 *   of the layout, or %NULL
 * @nat_width_p: (out) (allow-none): return location for the natural width
 *   of the layout, or %NULL
 *
 * Computes the minimum and natural widths of the @container according
 * to @manager.
 *
 * See also clutter_actor_get_preferred_width()
 *
 * Since: 1.2
 */
        get_preferred_width: function(container, for_height) {
            WARN_NOT_IMPLEMENTED(this, 'get_preferred_width');

            return {
                min_width: 0,
                natural_width: 0
            };
        },
        get_preferred_height: function(container, for_width) {
            WARN_NOT_IMPLEMENTED(this, 'get_preferred_height');

            return {
                min_height: 0,
                natural_height: 0
            };
        },
        allocate: function(container, allocation, flags) {
            WARN_NOT_IMPLEMENTED(this, 'allocate');
        },

/**
 * clutter_layout_manager_layout_changed:
 * @manager: a #ClutterLayoutManager
 *
 * Emits the #ClutterLayoutManager::layout-changed signal on @manager
 *
 * This function should only be called by implementations of the
 * #ClutterLayoutManager class
 *
 * Since: 1.2
 */
        layout_changed: function() {
            if (!this.freeze_change) {
                this.emit('layout-changed');
            } else {
                Note.LAYOUT("Layout manager has been frozen", this);
            }
        },
/**
 * clutter_layout_manager_set_container:
 * @manager: a #ClutterLayoutManager
 * @container: (allow-none): a #ClutterContainer using @manager
 *
 * If the #ClutterLayoutManager sub-class allows it, allow
 * adding a weak reference of the @container using @manager
 * from within the layout manager
 *
 * The layout manager should not increase the reference
 * count of the @container
 *
 * Since: 1.2
 */
        set container(container) {
            container._layout_manager = this;
        },
        create_child_meta: function(container, actor) {
            var MetaType = this.child_meta_type;
            /* provide a default implementation to reduce common code */
            if (MetaType) {
                return new MetaType(this, container, actor);
            }
            return null;
        },
        child_meta_type: null /* override in subclass */,

        _create_child_meta: function(container, actor) {
            this.freeze_layout_change();
            var meta = this.create_child_meta(container, actor);
            this.thaw_layout_change();
            return meta;
        },
        _get_child_meta: function(container, actor) {
            var layout = actor[QUARK_LAYOUT_META];
            if (layout) {
                console.assert(layout instanceof LayoutMeta);
                console.assert(layout instanceof ChildMeta);
                var child = layout;

                if (layout.manager === this &&
                    child.container === container &&
                    child.actor === actor) {
                    return layout;
                }

                /* if the LayoutMeta referenced is not attached to the
                 * layout manager then we simply ask the layout manager
                 * to replace it with the right one
                 */
            }
            layout = this._create_child_meta(container, actor);
            if (layout) {
                console.assert(layout instanceof LayoutMeta);
                actor[QUARK_LAYOUT_META] = layout;
                return layout;
            }
            return null;
        },
/**
 * clutter_layout_manager_get_child_meta:
 * @manager: a #ClutterLayoutManager
 * @container: a #ClutterContainer using @manager
 * @actor: a #ClutterActor child of @container
 *
 * Retrieves the #ClutterLayoutMeta that the layout @manager associated
 * to the @actor child of @container, eventually by creating one if the
 * #ClutterLayoutManager supports layout properties
 *
 * Return value: (transfer none): a #ClutterLayoutMeta, or %NULL if the
 *   #ClutterLayoutManager does not have layout properties. The returned
 *   layout meta instance is owned by the #ClutterLayoutManager and it
 *   should not be unreferenced
 *
 * Since: 1.0
 */
        get_child_meta: function(container, actor) {
            console.assert(this instanceof LayoutManager);
            console.assert(actor instanceof Actor);
            return this._get_child_meta(container, actor);
        },

/**
 * clutter_layout_manager_child_set_property:
 * @manager: a #ClutterLayoutManager
 * @container: a #ClutterContainer using @manager
 * @actor: a #ClutterActor child of @container
 * @property_name: the name of the property to set
 * @value: a #GValue with the value of the property to set
 *
 * Sets a property on the #ClutterLayoutMeta created by @manager and
 * attached to a child of @container
 *
 * Since: 1.2
 */
        child_set_property: function(container, actor, name, value) {
            var meta = this._get_child_meta(container, actor);
            if (!meta) {
                console.warn("This layout manager does not support layout "+
                             "metadata", this);
                return;
            }
            meta[name] = value;
        },
/**
 * clutter_layout_manager_child_get_property:
 * @manager: a #ClutterLayoutManager
 * @container: a #ClutterContainer using @manager
 * @actor: a #ClutterActor child of @container
 * @property_name: the name of the property to get
 * @value: a #GValue with the value of the property to get
 *
 * Gets a property on the #ClutterLayoutMeta created by @manager and
 * attached to a child of @container
 *
 * The #GValue must already be initialized to the type of the property
 * and has to be unset with g_value_unset() after extracting the real
 * value out of it
 *
 * Since: 1.2
 */
        child_get_property: function(container, actor, name) {
            var meta = this._get_child_meta(container, actor);
            if (!meta) {
                console.warn("This layout manager does not support layout "+
                             "metadata", this);
                return;
            }
            return meta[name];
        }
    };
    Signals.addSignalMethods(LayoutManager.prototype);
    Signals.register(LayoutManager.prototype, {
        'layout-changed': { flags: Signals.RUN_LAST }
    });

    return LayoutManager;
});

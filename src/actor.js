/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./color", "./context", "./enums", "./event", "./feature", "./geometry", "./margin", "./note", "./paint-volume", "./signals", "./vertex"], function(Color, Context, Enums, Event, Feature, Geometry, Margin, Note, PaintVolume, Signals, Vertex) {
    // XXX CSA note: show/show_all, hide/hide_all seem to be named funny;
    // the klass named real_show as show, etc.

    /**
     * @short_description: Base abstract class for all visual stage actors.
     *
     * The Actor class is the basic element of the scene graph in jutter,
     * and it encapsulates the position, size, and transformations of a node in
     * the graph.
     */
    var MapState = {
        CHECK: 0,
        MAKE_UNREALIZED: 1,
        MAKE_MAPPED: 2,
        MAKE_UNMAPPED: 3
    };
    Object.freeze(MapState);

    var ActorFlags = {
        MAPPED:    1 << 1,
        REALIZED:  1 << 2,
        REACTIVE:  1 << 3,
        VISIBLE:   1 << 4,
        NO_LAYOUT: 1 << 5
    };
    Object.freeze(ActorFlags);

    var TraverseFlags = {
        DEPTH_FIRST:   1 << 0,
        BREADTH_FIRST: 1 << 1
    };
    Object.freeze(TraverseFlags);

    var TraverseVisitFlags = {
        CONTINUE:      1 << 0,
        SKIP_CHILDREN: 1 << 1,
        BREAK:         1 << 2
    };
    Object.freeze(TraverseVisitFlags);

    var AddChildFlags = {
        CREATE_META:      1 << 0,
        EMIT_PARENT_SET:  1 << 1,
        EMIT_ACTOR_ADDED: 1 << 2,
        CHECK_STATE:      1 << 3,
        NOTIFY_FIRST_LAST:1 << 4
    };
    AddChildFlags.DEFAULT_FLAGS =
        AddChildFlags.CREATE_META |
        AddChildFlags.EMIT_PARENT_SET |
        AddChildFlags.EMIT_ACTOR_ADDED |
        AddChildFlags.CHECK_STATE |
        AddChildFlags.NOTIFY_FIRST_LAST;
    AddChildFlags.LEGACY_FLAGS =
        AddChildFlags.EMIT_PARENT_SET |
        AddChildFlags.CHECK_STATE |
        AddChildFlags.NOTIFY_FIRST_LAST;
    Object.freeze(AddChildFlags);

    var RemoveChildFlags = {
        DESTROY_META:       1 << 0,
        EMIT_PARENT_SET:    1 << 1,
        EMIT_ACTOR_REMOVED: 1 << 2,
        CHECK_STATE:        1 << 3,
        FLUSH_QUEUE:        1 << 4,
        NOTIFY_FIRST_LAST:  1 << 5
    };
    RemoveChildFlags.DEFAULT_FLAGS =
        RemoveChildFlags.DESTROY_META |
        RemoveChildFlags.EMIT_PARENT_SET |
        RemoveChildFlags.EMIT_ACTOR_REMOVED |
        RemoveChildFlags.CHECK_STATE |
        RemoveChildFlags.FLUSH_QUEUE |
        RemoveChildFlags.NOTIFY_FIRST_LAST;
    RemoveChildFlags.LEGACY_FLAGS =
        RemoveChildFlags.CHECK_STATE |
        RemoveChildFlags.FLUSH_QUEUE |
        RemoveChildFlags.EMIT_PARENT_SET |
        RemoveChildFlags.NOTIFY_FIRST_LAST;
    Object.freeze(RemoveChildFlags);

    var RedrawFlags = {
        CLIPPED_TO_ALLOCATION: 1 << 0
    };
    Object.freeze(RedrawFlags);

    var ActorPrivateFlags = {
        IN_DESTRUCTION:  1 << 0,
        IS_TOPLEVEL   :  1 << 1,
        IN_REPARENT   :  1 << 2,
        IN_PAINT      :  1 << 3,
        IN_RELAYOUT   :  1 << 4,
        IN_RESIZE     :  1 << 5,
        INTERNAL_CHILD:  1 << 6
    };
    Object.freeze(ActorPrivateFlags);


/*< private >
 * ClutterLayoutInfo:
 * @fixed_x: the fixed position of the actor, set using clutter_actor_set_x()
 * @fixed_y: the fixed position of the actor, set using clutter_actor_set_y()
 * @margin: the composed margin of the actor
 * @x_expand: whether the actor should expand horizontally
 * @y_expand: whether the actor should expand vertically
 * @x_align: the horizontal alignment, if the actor expands horizontally
 * @y_align: the vertical alignment, if the actor expands vertically
 * @min_width: the minimum width, set using clutter_actor_set_min_width()
 * @min_height: the minimum height, set using clutter_actor_set_min_height()
 * @natural_width: the natural width, set using clutter_actor_set_natural_width()
 * @natural_height: the natural height, set using clutter_actor_set_natural_height()
 *
 * Ancillary layout information for an actor.
 */
    var LayoutInfo = function() {
        this.margin = new Margin();
    };
    // default_layout_info
    LayoutInfo.prototype = {
        fixed_x: 0,
        fixed_y: 0,
        margin: null,
        x_align: Enums.ActorAlign.FILL,
        y_align: Enums.ActorAlign.FILL,
        min_width: 0,
        min_height: 0,
        natural_width: 0,
        natural_height: 0
    };

/*< private >
 * effective_align:
 * @align: a #ClutterActorAlign
 * @direction: a #ClutterTextDirection
 *
 * Retrieves the correct alignment depending on the text direction
 *
 * Return value: the effective alignment
 */
    var effective_align = function(align, direction) {
        var res = align;
        if (align === Enums.ActorAlign.START) {
            res = (direction === Enums.TextDirection.RTL) ?
                Enums.ActorAlign.END :
                Enums.ActorAlign.START;
        } else if (align === Enums.ActorAlign.END) {
            res = (direction === Enums.TextDirection.RTL) ?
                Enums.ActorAlign.START :
                Enums.ActorAlign.END;
        }
        return res;
    };
    var adjust_for_margin = function(margin_start, margin_end,
                                     self1, MINIMUM_SIZE, NATURAL_SIZE,
                                     self2, ALLOCATED_START, ALLOCATED_END) {
        self1[MINIMUM_SIZE] -= (margin_start + margin_end);
        self1[NATURAL_SIZE] -= (margin_start + margin_end);
        self2[ALLOCATED_START] += margin_start;
        self2[ALLOCATED_END] -= margin_end;
    };
    var adjust_for_alignment = function(alignment, natural_size,
                                        self, ALLOCATED_START, ALLOCATED_END) {
        var allocated_size = self[ALLOCATED_END] - self[ALLOCATED_START];

        if (alignment === Enums.ActorAlign.FILL) {
            /* do nothing */
        } else if (alignment === Enums.ActorAlign.START) {
            /* keep start */
            self[ALLOCATED_END] = self[ALLOCATED_START] +
                Math.min(natural_size, allocated_size);
        } else if (alignment === Enums.ActorAlign.END) {
            if (allocated_size > natural_size) {
                self[ALLOCATED_START] += (allocated_size - natural_size);
                self[ALLOCATED_END] = self[ALLOCATED_START] + natural_size;
            }
        } else if (alignment === Enums.ActorAlign.CENTER) {
            if (allocated_size > natural_size) {
                self[ALLOCATED_START] += Math.ceil((allocated_size - natural_size) / 2);
                self[ALLOCATED_END] = self[ALLOCATED_START] + Math.min(allocated_size, natural_size);
            }
        }
    };

    var PRIVATE = "_actor_private";
    var ActorPrivate = function() {
        this._init();
    };
    ActorPrivate.prototype = {
        _init: function() {
            this.flags = 0;
            this.pick_id = -1;
            this.name = null;

            this.opacity = 0xFF;
            this.show_on_set_parent = true;

            this.needs_width_request = true;
            this.needs_height_request = true;
            this.needs_allocation = true;

            this.cached_width_age = 1;
            this.cached_height_age = 1;

            this.opacity_override = -1;
            this.enable_model_view_transform = true;

            /* Initialize an empty paint volume to start with */
            this.last_paint_volume = new PaintVolume();
            this.last_paint_volume.init(); // XXX CSA unnecessary?
            this.last_paint_volume_valid = true;

            this.transform_valid = false;

            this.has_clip = false;
            this.clip = new Geometry(0,0,0,0);
        },
        get in_destruction() {
            return !!(this.flags & ActorPrivateFlags.IN_DESTRUCTION);
        },
        get toplevel() {
            return !!(this.flags & ActorPrivateFlags.IS_TOPLEVEL);
        },
        get in_reparent() {
            return !!(this.flags & ActorPrivateFlags.INTERNAL_CHILD);
        },
        get in_paint() {
            return !!(this.flags & ActorPrivateFlags.IN_PAINT);
        },
        get in_relayout() {
            return !!(this.flags & ActorPrivateFlags.IN_RELAYOUT);
        },
        get in_resize() {
            return !!(this.flags & ActorPrivateFlags.IN_RESIZE);
        },
        get internal_child() {
            return !!(this.flags & ActorPrivateFlags.INTERNAL_CHILD);
        }
    };

    var Actor = function(params) {
        this._init(params);
    };
    Actor.prototype = {
        _init: function(params) {
            this.flags = 0;
            this[PRIVATE] = new ActorPrivate();
            this[PRIVATE].id = Context.acquire_id(this);
            this.set_props(params);
        },
        set_props: function(params) {
            var key;
            if (!params) { return; }
            for (key in params) {
                if (params.hasOwnProperty(key)) {
                    this[key] = params[key];
                }
            }
        },
/* XXX - this is for debugging only, remove once working (or leave
 * in only in some debug mode). Should leave it for a little while
 * until we're confident in the new map/realize/visible handling.
 */
// line 731
        verify_map_state: function() {
            // DEBUGGING ONLY
            // could stick a 'return' here once this is all tested & working
            var priv = this[PRIVATE];

            if (this.realized) {
                /* all bets are off during reparent when we're potentially realized,
                 * but should not be according to invariants
                 */
                if (!priv.in_reparent) {
                    if (!priv.parent) {
                        if (priv.toplevel) {
                            /* ok */
                        } else {
                            console.warn("Realized non-toplevel actor should"+
                                         " have a parent", this);
                        }
                    } else if (!priv.parent.realized) {
                        console.warn("Realized actor has an unrealized parent",
                                     this, priv.parent);
                    }
                }
            }

            if (this.mapped) {
                if (!this.realized) {
                    console.warn("Actor is mapped but not realized", this);
                }

                /* remaining bets are off during reparent when we're potentially
                 * mapped, but should not be according to invariants
                 */
                if (!priv.in_reparent) {
                    if (!priv.parent) {
                        if (priv.toplevel) {
                            if ((!this.visible) &&
                                (!priv.in_destruction)) {
                                console.warn("Top level actor is mapped but "+
                                             "not visible", this);
                            }
                        } else {
                            console.warn("Mapped actor should have a parent",
                                         this);
                        }
                    } else {
                        var iter = this;

                        /* check for the enable_paint_unmapped flag on the actor
                         * and parents; if the flag is enabled at any point of this
                         * branch of the scene graph then all the later checks
                         * become pointless
                         */
                        while (iter) {
                            if (iter[PRIVATE].enable_paint_unmapped) {
                                return;
                            }

                            iter = iter[PRIVATE].parent;
                        }

                        if (!priv.parent.visible) {
                            console.warn("Actor should not be mapped if parent"+
                                         " is not visible", this, priv.parent);
                        }
                        if (!priv.parent.realized) {
                            console.warn("Actor should not be mapped if parent"+
                                         " is not realized", this, priv.parent);
                        }
                        if (!priv.parent[PRIVATE].toplevel) {
                            if (!priv.parent.mapped) {
                                console.warn("Actor is mapped but its "+
                                             "non-toplevel parent is not "+
                                             "mapped", this, priv.parent);
                            }
                        }
                    }
                }
            }
        },

        get mapped() { return !!(this.flags & ActorFlags.MAPPED); },
        // line 839
        set mapped(mapped) {
            if (this.mapped === mapped) { return; }
            if (mapped) {
                // CSA: virtual method invocation
                this.real_map();
            } else {
                // CSA: virtual method invocation
                this.real_unmap();
            }
            console.assert(this.mapped === mapped);
        },

        // line 861
        update_map_state: function(change) {
            var was_mapped = this.mapped;
            if (this[PRIVATE].toplevel) {
                /* the mapped flag on top-level actors must be set by the
                 * per-backend implementation because it might be asynchronous.
                 *
                 * That is, the MAPPED flag on toplevels currently tracks the X
                 * server mapped-ness of the window, while the expected behavior
                 * (if used to GTK) may be to track WM_STATE!=WithdrawnState.
                 * This creates some weird complexity by breaking the invariant
                 * that if we're visible and all ancestors shown then we are
                 * also mapped - instead, we are mapped if all ancestors
                 * _possibly excepting_ the stage are mapped. The stage
                 * will map/unmap for example when it is minimized or
                 * moved to another workspace.
                 *
                 * So, the only invariant on the stage is that if visible it
                 * should be realized, and that it has to be visible to be
                 * mapped.
                 */
                if (this.visible) {
                    this.realize();
                }

                if (change === MapState.CHECK) {
                    /* do nothing */
                } else if (change === MapState.MAKE_MAPPED) {
                    console.assert(!was_mapped);
                    this.mapped = true;
                } else if (change === MapState.MAKE_UNMAPPED) {
                    console.assert(was_mapped);
                    this.mapped = false;
                } else if (change === MapState.MAKE_UNREALIZED) {
                    /* we only use MAKE_UNREALIZED in unparent,
                     * and unparenting a stage isn't possible.
                     * If someone wants to just unrealize a stage
                     * then clutter_actor_unrealize() doesn't
                     * go through this codepath.
                     */
                    console.warn("Trying to force unrealize stage is not "+
                                 "allowed");
                }

                if (this.mapped && !this.visible &&
                    !this[PRIVATE].in_destruction) {
                    console.warn("Clutter toplevel is not visible, "+
                                 "but it is somehow still mapped", this);
                }
            } else {
                var parent = this[PRIVATE].parent;

                var should_be_mapped = false;
                var may_be_realized = true;
                var must_be_realized = false;

                if ((!parent) || change === MapState.MAKE_UNREALIZED) {
                    may_be_realized = false;
                } else {
                    /* Maintain invariant that if parent is mapped, and we are
                     * visible, then we are mapped ...  unless parent is a
                     * stage, in which case we map regardless of parent's map
                     * state but do require stage to be visible and realized.
                     *
                     * If parent is realized, that does not force us to be
                     * realized; but if parent is unrealized, that does force
                     * us to be unrealized.
                     *
                     * The reason we don't force children to realize with
                     * parents is _clutter_actor_rerealize(); if we require that
                     * a realized parent means children are realized, then to
                     * unrealize an actor we would have to unrealize its
                     * parents, which would end up meaning unrealizing and
                     * hiding the entire stage. So we allow unrealizing a
                     * child (as long as that child is not mapped) while that
                     * child still has a realized parent.
                     *
                     * Also, if we unrealize from leaf nodes to root, and
                     * realize from root to leaf, the invariants are never
                     * violated if we allow children to be unrealized
                     * while parents are realized.
                     *
                     * When unmapping, MAP_STATE_MAKE_UNMAPPED is specified
                     * to force us to unmap, even though parent is still
                     * mapped. This is because we're unmapping from leaf nodes
                     * up to root nodes.
                     */
                    if (this.visible && change !== MapState.MAKE_UNMAPPED) {
                        var parent_is_visible_realized_toplevel;
                        parent_is_visible_realized_toplevel =
                            parent[PRIVATE].toplevel &&
                            parent.visible && parent.realized;

                        if (parent.mapped ||
                            parent_is_visible_realized_toplevel) {
                            must_be_realized = true;
                            should_be_mapped = true;
                        }
                    }
                    /* if the actor has been set to be painted even if unmapped
                     * then we should map it and check for realization as well;
                     * this is an override for the branch of the scene graph
                     * which begins with this node
                     */
                    if (this[PRIVATE].enable_paint_unmapped) {
                        if (!parent) {
                            console.warn("Attempting to map an "+
                                         "unparented actor", this);
                        }
                        should_be_mapped = true;
                        must_be_realized = true;
                    }

                    if (!parent.realized) {
                        may_be_realized = false;
                    }
                }
                if (change === MapState.MAKE_MAPPED && !should_be_mapped) {
                    if (!parent) {
                        console.warn("Attempting to map a child that does not"+
                                     " meet the necessary invariants: the"+
                                     " actor has no parent", this);
                    } else {
                        console.warn("Attempting to map a child that does not"+
                                     " meet the necessary invariants: the"+
                                     " actor is parented to an unmapped actor",
                                     this, parent);
                    }
                }
                /* If in reparent, we temporarily suspend unmap and unrealize.
                 *
                 * We want to go in the order "realize, map" and "unmap, unrealize"
                 */

                /* Unmap */
                if (!should_be_mapped && !this[PRIVATE].in_reparent) {
                    this.mapped = false;
                }

                /* Realize */
                if (must_be_realized) {
                    this.realize();
                }

                /* if we must be realized then we may be, presumably */
                console.assert(!(must_be_realized && !may_be_realized));

                /* Unrealize */
                if (!may_be_realized && !this[PRIVATE].in_reparent) {
                    this._unrealize_not_hiding();
                }

                /* Map */
                if (should_be_mapped) {
                    if (!must_be_realized) {
                        console.warn("Somehow we think actor should be mapped"+
                                     " but not realized, which isn't allowed",
                                     this);
                    }

                    /* realization is allowed to fail (though I don't know what
                     * an app is supposed to do about that - shouldn't it just
                     * be a g_error? anyway, we have to avoid mapping if this
                     * happens)
                     */
                    if (this.realized) {
                        this.mapped = true;
                    }
                }
            }

            /* check all invariants were kept */
            this.verify_map_state();
        },

        // CSA: this is virtual method
        // line 1068
        real_map: function() {
            console.assert(!this.mapped);

            Note.ACTOR("Mapping actor", this);
            this.flags |= ActorFlags.MAPPED;

            var stage = this._get_stage_internal();
            this[PRIVATE].pick_id = stage.acquire_pick_id(this);
            Note.ACTOR("Pick id", this[PRIVATE].pick_id,
                        "for actor", this);

            /* notify on parent mapped before potentially mapping
             * children, so apps see a top-down notification.
             */
            this.notify('mapped');

            this._foreach_child(function() { this.map(); });
        },

/**
 * clutter_actor_map:
 * @self: A #ClutterActor
 *
 * Sets the %CLUTTER_ACTOR_MAPPED flag on the actor and possibly maps
 * and realizes its children if they are visible. Does nothing if the
 * actor is not visible.
 *
 * Calling this is allowed in only one case: you are implementing the
 * #ClutterActor <function>map()</function> virtual function in an actor
 * and you need to map the children of that actor. It is not necessary
 * to call this if you implement #ClutterContainer because the default
 * implementation will automatically map children of containers.
 *
 * When overriding map, it is mandatory to chain up to the parent
 * implementation.
 *
 * Since: 1.0
 */
// line 1120
        map: function() {
            if (this.mapped) { return; }
            if (!this.visible) { return; }

            this.update_map_state(MapState.MAKE_MAPPED);
        },

        // line 1134
        real_unmap: function() {
            console.assert(this.mapped);
            Note.ACTOR("Unmapping actor", this);

            this._foreach_child(function() { this.unmap(); });

            this.flags &= (~ActorFlags.MAPPED);

            /* clear the contents of the last paint volume, so that hiding + moving +
             * showing will not result in the wrong area being repainted
             */
            this[PRIVATE].last_paint_volume.init();
            this[PRIVATE].last_paint_volume_valid = true;

            /* notify on parent mapped after potentially unmapping
             * children, so apps see a bottom-up notification.
             */
            this.notify('mapped');

            /* relinquish keyboard focus if we were unmapped while owning it */
            if (!this[PRIVATE].toplevel) {
                var stage = this._get_stage_internal();
                if (stage) {
                    stage._release_pick_id(this[PRIVATE].pick_id);
                }
                this[PRIVATE].pick_id = -1;
                if (stage && stage.key_focus === this) {
                    stage.key_focus = null;
                }
            }
        },

/**
 * clutter_actor_unmap:
 * @self: A #ClutterActor
 *
 * Unsets the %CLUTTER_ACTOR_MAPPED flag on the actor and possibly
 * unmaps its children if they were mapped.
 *
 * Calling this is allowed in only one case: you are implementing the
 * #ClutterActor <function>unmap()</function> virtual function in an actor
 * and you need to unmap the children of that actor. It is not necessary
 * to call this if you implement #ClutterContainer because the default
 * implementation will automatically unmap children of containers.
 *
 * When overriding unmap, it is mandatory to chain up to the parent
 * implementation.
 *
 * Since: 1.0
 */
// line 1203
        unmap: function() {
            if (!this.mapped) { return; }

            this.update_map_state(MapState.MAKE_UNMAPPED);
        },


        get visible() { return !!(this.flags & ActorFlags.VISIBLE); },
        set visible(visible) {
            // line 3936, roughly
            if (this.visible === visible) { return; }
            if (visible) {
                this.show();
            } else {
                this.hide();
            }
            console.assert(this.visible === visible);
        },
        // line 1214
        real_show: function() {
            if (this.visible) { return; }

            this.flags |= ActorFlags.VISIBLE;

            /* we notify on the "visible" flag in the clutter_actor_show()
             * wrapper so the entire show signal emission completes first
             * (?)
             */
            this.update_map_state(MapState.CHECK);

            /* we queue a relayout unless the actor is inside a
             * container that explicitly told us not to
             */
            var priv = this[PRIVATE];
            if (priv.parent && !priv.parent.no_layout) {
                /* While an actor is hidden the parent may not have
                 * allocated/requested so we need to start from scratch
                 * and avoid the short-circuiting in
                 * clutter_actor_queue_relayout().
                 */
                priv.needs_width_request  = false;
                priv.needs_height_request = false;
                priv.needs_allocation     = false;
                this.queue_relayout();
            }
        },

        set show_on_set_parent(set_show) {
            var priv = this[PRIVATE];
            set_show = !!set_show;
            if (priv.show_on_set_parent === set_show) {
                return;
            }
            if (!priv.parent) {
                priv.show_on_set_parent = set_show;
                this.notify('show_on_set_parent');
            }
        },
/**
 * clutter_actor_show:
 * @self: A #ClutterActor
 *
 * Flags an actor to be displayed. An actor that isn't shown will not
 * be rendered on the stage.
 *
 * Actors are visible by default.
 *
 * If this function is called on an actor without a parent, the
 * #ClutterActor:show-on-set-parent will be set to %TRUE as a side
 * effect.
 */
        show: function() {
            /* simple optimization */
            if (this.visible) {
                /* we still need to set the :show-on-set-parent property, in
                 * case show() is called on an unparented actor
                 */
                this.show_on_set_parent = true;
                return;
            }

            this.verify_map_state();

            this.freeze_notify();

            this.show_on_set_parent = true;

            this.emit('show');
            console.assert(this.visible); // CSA toggled by closure on emit
            this.notify('visible');

            var priv = this[PRIVATE];
            if (priv.parent) {
                priv.parent.queue_redraw();
            }

            this.thaw_notify();
        },

        real_hide: function() {
            if (!this.visible) { return; }

            this.flags &= (~ActorFlags.VISIBLE);
            /* we notify on the "visible" flag in the clutter_actor_hide()
             * wrapper so the entire hide signal emission completes first
             * (?)
             */
            this.update_map_state(MapState.CHECK);

            /* we queue a relayout unless the actor is inside a
             * container that explicitly told us not to
             */
            var priv = this[PRIVATE];
            if (priv.parent && !priv.parent.no_layout) {
                priv.parent.queue_relayout();
            }
        },

/**
 * clutter_actor_hide:
 * @self: A #ClutterActor
 *
 * Flags an actor to be hidden. A hidden actor will not be
 * rendered on the stage.
 *
 * Actors are visible by default.
 *
 * If this function is called on an actor without a parent, the
 * #ClutterActor:show-on-set-parent property will be set to %FALSE
 * as a side-effect.
 */
        hide: function() {
            /* simple optimization */
            if (!this.visible) {
                /* we still need to set the :show-on-set-parent property, in
                 * case hide() is called on an unparented actor
                 */
                this.show_on_set_parent = false;
                return;
            }

            this.verify_map_state();

            this.freeze_notify();

            this.show_on_set_parent = false;

            this.emit('hide');
            console.assert(!this.visible); // CSA toggled by closure on emit
            this.notify('visible');

            var priv = this[PRIVATE];
            if (priv.parent) {
                priv.parent.queue_redraw();
            }

            this.thaw_notify();
        },

        get realized() { return !!(this.flags & ActorFlags.REALIZED); },
/**
 * clutter_actor_realize:
 * @self: A #ClutterActor
 *
 * Realization informs the actor that it is attached to a stage. It
 * can use this to allocate resources if it wanted to delay allocation
 * until it would be rendered. However it is perfectly acceptable for
 * an actor to create resources before being realized because Clutter
 * only ever has a single rendering context so that actor is free to
 * be moved from one stage to another.
 *
 * This function does nothing if the actor is already realized.
 *
 * Because a realized actor must have realized parent actors, calling
 * clutter_actor_realize() will also realize all parents of the actor.
 *
 * This function does not realize child actors, except in the special
 * case that realizing the stage, when the stage is visible, will
 * suddenly map (and thus realize) the children of the stage.
 **/
        realize: function() {
            this.verify_map_state();
            if (this.realized) { return; }

            /* To be realized, our parent actors must be realized first.
             * This will only succeed if we're inside a toplevel.
             */
            var priv = this[PRIVATE];
            if (priv.parent) {
                priv.parent.realize();
            }

            if (priv.toplevel) {
                /* toplevels can be realized at any time */
            } else {
                /* "Fail" the realization if parent is missing or unrealized;
                 * this should really be a g_warning() not some kind of runtime
                 * failure; how can an app possibly recover? Instead it's a bug
                 * in the app and the app should get an explanatory warning so
                 * someone can fix it. But for now it's too hard to fix this
                 * because e.g. ClutterTexture needs reworking.
                 */
                if ((!priv.parent) || (!priv.parent.realized)) {
                    return;
                }
            }

            Note.ACTOR("Realizing actor", this);

            this.flags |= ActorFlags.REALIZED;
            this.notify('realized');

            this.emit('realize');

            /* Stage actor is allowed to unset the realized flag again in its
             * default signal handler, though that is a pathological situation.
             */

            /* If realization "failed" we'll have to update child state. */
            this.update_map_state(MapState.CHECK);
        },
        real_unrealize: function() {
            /* we must be unmapped (implying our children are also unmapped) */
            console.assert(!this.mapped);
        },
/**
 * clutter_actor_unrealize:
 * @self: A #ClutterActor
 *
 * Unrealization informs the actor that it may be being destroyed or
 * moved to another stage. The actor may want to destroy any
 * underlying graphics resources at this point. However it is
 * perfectly acceptable for it to retain the resources until the actor
 * is destroyed because Clutter only ever uses a single rendering
 * context and all of the graphics resources are valid on any stage.
 *
 * Because mapped actors must be realized, actors may not be
 * unrealized if they are mapped. This function hides the actor to be
 * sure it isn't mapped, an application-visible side effect that you
 * may not be expecting.
 *
 * This function should not be called by application code.
 */
        unrealize: function() {
            console.assert(!this.mapped);

            /* This function should not really be in the public API, because
             * there isn't a good reason to call it. ClutterActor will already
             * unrealize things for you when it's important to do so.
             *
             * If you were using clutter_actor_unrealize() in a dispose
             * implementation, then don't, just chain up to ClutterActor's
             * dispose.
             *
             * If you were using clutter_actor_unrealize() to implement
             * unrealizing children of your container, then don't, ClutterActor
             * will already take care of that.
             *
             * If you were using clutter_actor_unrealize() to re-realize to
             * create your resources in a different way, then use
             * _clutter_actor_rerealize() (inside Clutter) or just call your
             * code that recreates your resources directly (outside Clutter).
             */
            this.verify_map_state();

            this.hide();

            this._unrealize_not_hiding();
        },
/*
 * clutter_actor_unrealize_not_hiding:
 * @self: A #ClutterActor
 *
 * Unrealization informs the actor that it may be being destroyed or
 * moved to another stage. The actor may want to destroy any
 * underlying graphics resources at this point. However it is
 * perfectly acceptable for it to retain the resources until the actor
 * is destroyed because Clutter only ever uses a single rendering
 * context and all of the graphics resources are valid on any stage.
 *
 * Because mapped actors must be realized, actors may not be
 * unrealized if they are mapped. You must hide the actor or one of
 * its parents before attempting to unrealize.
 *
 * This function is separate from clutter_actor_unrealize() because it
 * does not automatically hide the actor.
 * Actors need not be hidden to be unrealized, they just need to
 * be unmapped. In fact we don't want to mess up the application's
 * setting of the "visible" flag, so hiding is very undesirable.
 *
 * clutter_actor_unrealize() does a clutter_actor_hide() just for
 * backward compatibility.
 */
        _unrealize_not_hiding: function() {
            var unrealize_before_children = function() {
                /* If an actor is already unrealized we know its children have also
                 * already been unrealized... */
                if (!this.realized) {
                    return TraverseVisitFlags.SKIP_CHILDREN;
                }

                this.emit('unrealize');// CSA: invokes real_unrealize virtually

                return TraverseVisitFlags.CONTINUE;
            };
            var unrealize_after_children = function() {
                /* We want to unset the realized flag only _after_
                 * child actors are unrealized, to maintain invariants.
                 */
                this.flags &= (~ActorFlags.REALIZED);
                this.notify('realized');
                return TraverseVisitFlags.CONTINUE;
            };
            this._traverse(TraverseFlags.DEPTH_FIRST,
                           unrealize_before_children,
                           unrealize_after_children);
        },
/*
 * _clutter_actor_rerealize:
 * @self: A #ClutterActor
 * @callback: Function to call while unrealized
 *
 * If an actor is already unrealized, this just calls the callback.
 *
 * If it is realized, it unrealizes temporarily, calls the callback,
 * and then re-realizes the actor.
 *
 * As a side effect, leaves all children of the actor unrealized if
 * the actor was realized but not showing.  This is because when we
 * unrealize the actor temporarily we must unrealize its children
 * (e.g. children of a stage can't be realized if stage window is
 * gone). And we aren't clever enough to save the realization state of
 * all children. In most cases this should not matter, because
 * the children will automatically realize when they next become mapped.
 */
// line 1648
        _rerealize: function(callback) {
            this.verify_map_state();

            var was_realized = this.realized;
            var was_mapped = this.mapped;
            var was_visible = this.visible;

            /* Must be unmapped to unrealize. Note we only have to hide this
             * actor if it was mapped (if all parents were showing).  If actor
             * is merely visible (but not mapped), then that's fine, we can
             * leave it visible.
             */
            if (was_mapped) {
                this.hide();
            }

            console.assert(!this.mapped);

            /* unrealize self and all children */
            this._unrealize_not_hiding();

            if (callback) { callback.call(this); }

            if (was_visible) {
                this.show(); /* will realize only if mapping implies it */
            } else if (was_realized) {
                this.realize(); /* realize self and all parents */
            }
        },

        // line 1691
        real_pick: function(color) {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_should_pick_paint:
 * @self: A #ClutterActor
 *
 * Should be called inside the implementation of the
 * #ClutterActor::pick virtual function in order to check whether
 * the actor should paint itself in pick mode or not.
 *
 * This function should never be called directly by applications.
 *
 * Return value: %TRUE if the actor should paint its silhouette,
 *   %FALSE otherwise
 */
// line 1747
        should_pick_paint: function() {
            if (this.mapped &&
                (Context._get_pick_mode() === Enums.PickMode.ALL ||
                 this.reactive)) {
                return true;
            }
            return false;
        },

        // line 1760
        real_get_preferred_width: function(for_height) {
            var priv = this[PRIVATE];
            if (priv.n_children !== 0 &&
                priv.layout_manager) {
                Note.LAYOUT("Querying the layout manager for the preferred "+
                            "width", priv.layout_manager);
                return priv.layout_manager.get_preferred_width(this,
                                                               for_height);
            }
            /* Default implementation is always 0x0, usually an actor
             * using this default is relying on someone to set the
             * request manually
             */
            Note.LAYOUT("Default preferred width: 0, 0");

            return {
                min_width: 0,
                natural_width: 0
            };
        },

        // line 1800
        real_get_preferred_height: function(for_width) {
            var priv = this[PRIVATE];
            if (priv.n_children !== 0 &&
                priv.layout_manager) {
                Note.LAYOUT("Querying the layout manager for the preferred "+
                            "height", priv.layout_manager);
                return priv.layout_manager.get_preferred_height(this,
                                                                for_width);
            }
            /* Default implementation is always 0x0, usually an actor
             * using this default is relying on someone to set the
             * request manually
             */
            Note.LAYOUT("Default preferred height: 0, 0");

            return {
                min_height: 0,
                natural_height: 0
            };
        },

        // line 1839
        _store_old_geometry: function() {
            return this[PRIVATE].allocation.copy();
        },

        // line 1846
        _notify_if_geometry_changed: function(old) {
            this.freeze_notify();
  /* to avoid excessive requisition or allocation cycles we
   * use the cached values.
   *
   * - if we don't have an allocation we assume that we need
   *   to notify anyway
   * - if we don't have a width or a height request we notify
   *   width and height
   * - if we have a valid allocation then we check the old
   *   bounding box with the current allocation and we notify
   *   the changes
   */
            if (this[PRIVATE].needs_allocation) {
                this.notify('x');
                this.notify('y');
                this.notify('width');
                this.notify('height');
            } else if (this[PRIVATE].needs_width_request ||
                       this[PRIVATE].needs_height_request) {
                this.notify('width');
                this.notify('height');
            } else {
                var xu, yu, widthu, heightu;
                var allocu = this[PRIVATE].allocation;
                xu = allocu.x1;
                yu = allocu.y1;
                widthu = allocu.x2 - allocu.x1;
                heightu = allocu.y2 - allocu.y1;

                if (xu !== old.x1) {
                    this.notify('x');
                }
                if (yu !== old.y1) {
                    this.notify('y');
                }
                if (widthu !== (old.x2 - old.x1)) {
                    this.notify('width');
                }
                if (heightu !== (old.y2 - old.y1)) {
                    this.notify('height');
                }
            }
            this.thaw_notify();
        },

/*< private >
 * clutter_actor_set_allocation_internal:
 * @self: a #ClutterActor
 * @box: a #ClutterActorBox
 * @flags: allocation flags
 *
 * Stores the allocation of @self.
 *
 * This function only performs basic storage and property notification.
 *
 * This function should be called by clutter_actor_set_allocation()
 * and by the default implementation of #ClutterActorClass.allocate().
 *
 * Return value: %TRUE if the allocation of the #ClutterActor has been
 *   changed, and %FALSE otherwise
 */
        // line 1920
        _set_allocation_internal: function(box, flags) {
            var retval;
            this.freeze_notify();

            var old_alloc = this._store_old_geometry();
            var x1_changed = (old_alloc.x1 !== box.x1);
            var y1_changed = (old_alloc.y1 !== box.y1);
            var x2_changed = (old_alloc.x2 !== box.x2);
            var y2_changed = (old_alloc.y2 !== box.y2);

            var flags_changed = (this[PRIVATE].allocation_flags !== flags);

            this[PRIVATE].allocation.set_from_box(box);
            this[PRIVATE].allocation_flags = flags;

            /* allocation is authoritative */
            this[PRIVATE].needs_width_request = false;
            this[PRIVATE].needs_height_request = false;
            this[PRIVATE].needs_allocation = false;

            if (x1_changed || y1_changed || x2_changed || y2_changed ||
                flags_changed) {
                Note.LAYOUT("Allocation changed", this);
                this[PRIVATE].transform_valid = false;
                this.notify('allocation');
                retval = true;
            } else {
                retval = false;
            }
            this._notify_if_geometry_changed(old_alloc);
            this.thaw_notify();
            return retval;
        },

        // line 1978
        _maybe_layout_children: function(allocation, flags) {
            console.assert(false, "Unimplemented");
        },

        // line 2063
        real_allocate: function(box, flags) {
            var priv = this[PRIVATE];

            this.freeze_notify();
            var changed = this._set_allocation_internal(box, flags);
            /* we allocate our children before we notify changes in our geometry,
             * so that people connecting to properties will be able to get valid
             * data out of the sub-tree of the scene graph that has this actor at
             * the root.
             */
            this._maybe_layout_children(box, flags);

            if (changed) {
                this.emit('allocation-changed',
                          priv.allocation, priv.allocation_flags);
            }

            this.thaw_notify();
        },

        // line 2090
        _signal_queue_redraw: function(origin) {
            /* no point in queuing a redraw on a destroyed actor */
            if (this[PRIVATE].in_destruction) {
                return;
            }

            /* NB: We can't bail out early here if the actor is hidden in case
             * the actor bas been cloned. In this case the clone will need to
             * receive the signal so it can queue its own redraw.
             */

            /* calls klass->queue_redraw in default handler */
            // CSA: or virtual function real_queue_redraw() in this impl.
            this.emit('queue-redraw', origin);
        },

        // line 2107
        real_queue_redraw: function(origin) {
            Note.PAINT("Redraw queued on ", this, " from ",
                       origin || "same actor");

            /* no point in queuing a redraw on a destroyed actor */
            if (this[PRIVATE].in_destruction) {
                return;
            }

            /* If the queue redraw is coming from a child then the actor has
               become dirty and any queued effect is no longer valid */
            if (this !== origin) {
                this[PRIVATE].is_dirty = true;
                this[PRIVATE].effect_to_redraw = null;
            }

            /* If the actor isn't visible, we still had to emit the signal
             * to allow for a ClutterClone, but the appearance of the parent
             * won't change so we don't have to propagate up the hierarchy.
             */
            if (!this.visible) {
                return;
            }

            /* Although we could determine here that a full stage redraw
             * has already been queued and immediately bail out, we actually
             * guarantee that we will propagate a queue-redraw signal to our
             * parent at least once so that it's possible to implement a
             * container that tracks which of its children have queued a
             * redraw.
             */
            if (this[PRIVATE].propagated_one_redraw) {
                var stage = this._get_stage_internal();
                if (stage && stage._has_full_redraw_queued()) {
                    return;
                }
            }

            this[PRIVATE].propagated_one_redraw = true;

            /* notify parents, if they are all visible eventually we'll
             * queue redraw on the stage, which queues the redraw idle.
             */
            var parent = this.parent;
            if (parent) {
                /* this will go up recursively */
                parent._signal_queue_redraw(origin);
            }
        },

        // line 2165
        real_queue_relayout: function() {
            var priv = this[PRIVATE];

            /* no point in queueing a redraw on a destroyed actor */
            if (priv.in_destruction) {
                return;
            }

            priv.needs_width_request  = true;
            priv.needs_height_request = true;
            priv.needs_allocation     = true;

            /* reset the cached size requests */
            priv.width_requests = []; // XXX CSA ?
            priv.height_requests = []; // XXX CSA ?

            /* We need to go all the way up the hierarchy */
            if (priv.parent) {
                priv.parent._queue_only_relayout();
            }
        },

/**
 * clutter_actor_apply_relative_transform_to_point:
 * @self: A #ClutterActor
 * @ancestor: (allow-none): A #ClutterActor ancestor, or %NULL to use the
 *   default #ClutterStage
 * @point: A point as #ClutterVertex
 * @vertex: (out caller-allocates): The translated #ClutterVertex
 *
 * Transforms @point in coordinates relative to the actor into
 * ancestor-relative coordinates using the relevant transform
 * stack (i.e. scale, rotation, etc).
 *
 * If @ancestor is %NULL the ancestor will be the #ClutterStage. In
 * this case, the coordinates returned will be the coordinates on
 * the stage before the projection is applied. This is different from
 * the behaviour of clutter_actor_apply_transform_to_point().
 *
 * Since: 0.6
 */
 // line 2208
        apply_relative_transform_to_point: function(ancestor, point) {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_apply_transform_to_point:
 * @self: A #ClutterActor
 * @point: A point as #ClutterVertex
 * @vertex: (out caller-allocates): The translated #ClutterVertex
 *
 * Transforms @point in coordinates relative to the actor
 * into screen-relative coordinates with the current actor
 * transformation (i.e. scale, rotation, etc)
 *
 * Since: 0.4
 **/
// line 2293
        apply_transform_to_point: function(point) {
            console.assert(false, "Unimplemented");
        },

        // line 2993
        real_paint: function() {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_paint:
 * @self: A #ClutterActor
 *
 * Renders the actor to display.
 *
 * This function should not be called directly by applications.
 * Call clutter_actor_queue_redraw() to queue paints, instead.
 *
 * This function is context-aware, and will either cause a
 * regular paint or a pick paint.
 *
 * This function will emit the #ClutterActor::paint signal or
 * the #ClutterActor::pick signal, depending on the context.
 *
 * This function does not paint the actor if the actor is set to 0,
 * unless it is performing a pick paint.
 */
// line 3053
        paint: function() {
            var priv = this[PRIVATE];
            if (priv.in_destruction) {
                return;
            }
            var pick_mode = Context._get_pick_mode();

            if (pick_mode === Enums.PickMode.NONE) {
                priv.propagate_one_redraw = false;
            }

            /* It's an important optimization that we consider painting of
             * actors with 0 opacity to be a NOP... */
            console.assert(priv.opacity_override !== null);
            if (pick_mode === Enums.PickMode.NONE &&
                /* ignore top-levels, since they might be transparent */
                (!priv.toplevel) &&
                /* Use the override opacity if its been set */
                ((priv.opacity_override >= 0) ?
                 priv.opacity_override : priv.opacity) === 0) {
                return;
            }

            /* if we aren't paintable (not in a toplevel with all
             * parents paintable) then do nothing.
             */
            if (!this.mapped) {
                return;
            }

            /* mark that we are in the paint process */
            priv.flags |= ActorPrivateFlags.IN_PAINT;

            // XXX not implemented past this point.
            console.assert(false, "Unimplemented");
        },

/*< private >
 * clutter_actor_remove_child_internal:
 * @self: a #ClutterActor
 * @child: the child of @self that has to be removed
 * @flags: control the removal operations
 *
 * Removes @child from the list of children of @self.
 */
// line 3439
        _remove_child_internal: function(child, flags) {
            var destroy_meta = !!(flags & RemoveChildFlags.DESTROY_META);
            var emit_parent_set = !!(flags & RemoveChildFlags.EMIT_PARENT_SET);
            var emit_actor_removed = !!(flags & RemoveChildFlags.EMIT_ACTOR_REMOVED);
            var check_state = !!(flags & RemoveChildFlags.CHECK_STATE);
            var flush_queue = !!(flags & RemoveChildFlags.FLUSH_QUEUE);
            var notify_first_last = !!(flags & RemoveChildFlags.NOTIFY_FIRST_LAST);

            if (destroy_meta) {
                this.destroy_child_meta(child);
            }

            var was_mapped;
            if (check_state) {
                was_mapped = child.mapped;

                /* we need to unrealize *before* we set parent_actor to NULL,
                 * because in an unrealize method actors are dissociating from the
                 * stage, which means they need to be able to
                 * clutter_actor_get_stage().
                 *
                 * This should unmap and unrealize, unless we're reparenting.
                 */
                child.update_map_state(MapState.MAKE_UNREALIZED);
            } else {
                was_mapped = false;
            }

            if (flush_queue) {
                /* We take this opportunity to invalidate any queue redraw entry
                 * associated with the actor and descendants since we won't be able to
                 * determine the appropriate stage after this.
                 *
                 * we do this after we updated the mapped state because actors might
                 * end up queueing redraws inside their mapped/unmapped virtual
                 * functions, and if we invalidate the redraw entry we could end up
                 * with an inconsistent state and weird memory corruption. see
                 * bugs:
                 *
                 *   http://bugzilla.clutter-project.org/show_bug.cgi?id=2621
                 *   https://bugzilla.gnome.org/show_bug.cgi?id=652036
                 */
                var invalidate_queue_redraw_entry = function(depth) {
                    if (this[PRIVATE].queue_redraw_entry) {
                        this[PRIVATE].queue_redraw_entry.invalidate();
                        this[PRIVATE].queue_redraw_entry = null;
                    }
                    return TraverseVisitFlags.CONTINUE;
                };
                child._traverse(0, invalidate_queue_redraw_entry, null);
            }

            var old_first = this[PRIVATE].first_child;
            var old_last  = this[PRIVATE].last_child;

            var remove_child = function(self, child) {
                var prev_sibling = child[PRIVATE].prev_sibling;
                var next_sibling = child[PRIVATE].next_sibling;

                if (prev_sibling) {
                    prev_sibling[PRIVATE].next_sibling = next_sibling;
                }
                if (next_sibling) {
                    next_sibling[PRIVATE].prev_sibling = prev_sibling;
                }

                if (self[PRIVATE].first_child === child) {
                    self[PRIVATE].first_child = next_sibling;
                }
                if (self[PRIVATE].last_child === child) {
                    self[PRIVATE].last_child = prev_sibling;
                }

                child[PRIVATE].parent = null;
                child[PRIVATE].prev_sibling = null;
                child[PRIVATE].next_sibling = null;
            };
            remove_child(this, child);

            this[PRIVATE].n_children -= 1;

            /* clutter_actor_reparent() will emit ::parent-set for us */
            if (emit_parent_set && !child[PRIVATE].in_reparent) {
                child.emit('parent-set', this/* old parent */);
            }

            /* if the child was mapped then we need to relayout ourselves to account
             * for the removed child
             */
            if (was_mapped) {
                this.queue_relayout();
            }

            /* we need to emit the signal before dropping the reference */
            if (emit_actor_removed) {
                this.emit('actor-removed', child);
            }

            if (notify_first_last) {
                if (old_first !== this[PRIVATE].first_child) {
                    this.notify('first_child');
                }
                if (old_last !== this[PRIVATE].last_child) {
                    this.notify('last_child');
                }
            }
        },

/*< private >
 * _clutter_actor_get_transform_info_or_defaults:
 * @self: a #ClutterActor
 *
 * Retrieves the ClutterTransformInfo structure associated to an actor.
 *
 * If the actor does not have a ClutterTransformInfo structure associated
 * to it, then the default structure will be returned.
 *
 * This function should only be used for getters.
 *
 * Return value: a const pointer to the ClutterTransformInfo structure
 */
        _get_transform_info_or_defaults: function() {
            console.assert(false, "Unimplemented");
        },

/*< private >
 * _clutter_actor_get_transform_info:
 * @self: a #ClutterActor
 *
 * Retrieves a pointer to the ClutterTransformInfo structure.
 *
 * If the actor does not have a ClutterTransformInfo associated to it, one
 * will be created and initialized to the default values.
 *
 * This function should be used for setters.
 *
 * For getters, you should use _clutter_actor_get_transform_info_or_defaults()
 * instead.
 *
 * Return value: (transfer none): a pointer to the ClutterTransformInfo
 *   structure
 */
        // line 3590
        _get_transform_info: function() {
            console.assert(false, "Unimplemented");
        },

        // line 4147
        get fixed_x() {
            var info = this._get_layout_info_or_defaults ();
            return info.fixed_x;
        },
        get fixed_y() {
            var info = this._get_layout_info_or_defaults ();
            return info.fixed_y;
        },
        get min_width() {
            var info = this._get_layout_info_or_defaults ();
            return info.min_width;
        },
        get min_height() {
            var info = this._get_layout_info_or_defaults ();
            return info.min_height;
        },
        get natural_width() {
            var info = this._get_layout_info_or_defaults ();
            return info.natural_width;
        },
        get natural_height() {
            var info = this._get_layout_info_or_defaults ();
            return info.natural_height;
        },
        get min_width_set() {
            return !!this[PRIVATE].min_width_set;
        },
        get min_height_set() {
            return !!this[PRIVATE].min_height_set;
        },
        get natural_width_set() {
            return !!this[PRIVATE].natural_width_set;
        },
        get natural_height_set() {
            return !!this[PRIVATE].natural_height_set;
        },
        get allocation() {
            return this[PRIVATE].allocation; //XXX CSA: .copy()?
        },
        // line 4232
        get offscreen_redirect() {
            return this[PRIVATE].offscreen_redirect;
        },
        // line 4273
        get scale_x() {
            var info = this._get_transform_info_or_defaults ();
            return info.scale_x;
        },
        //line 4282
        get scale_y() {
            var info = this._get_transform_info_or_defaults ();
            return info.scale_y;
        },
        //line 4353
        get rotation_angle_x() {
            var info = this._get_transform_info_or_defaults ();
            return info.rx_angle;
        },
        get rotation_angle_y() {
            var info = this._get_transform_info_or_defaults ();
            return info.ry_angle;
        },
        get rotation_angle_z() {
            var info = this._get_transform_info_or_defaults ();
            return info.rz_angle;
        },
        // line 4380
        get rotation_center_x() {
            return this.get_rotation(Enums.RotateAxis.X_AXIS);
        },
        get rotation_center_y() {
            return this.get_rotation(Enums.RotateAxis.Y_AXIS);
        },
        get rotation_center_z() {
            return this.get_rotation(Enums.RotateAxis.Z_AXIS);
        },

        // XXX CSA: more functions here

        // line 4455
        get show_on_set_parent() {
            return this[PRIVATE].show_on_set_parent;
        },
        get text_direction() {
            return this[PRIVATE].text_direction;
        },
        get has_pointer() {
            return this[PRIVATE].has_pointer;
        },
        // line 4525
        get background_color_set() {
            return this[PRIVATE].bg_color_set;
        },

        // line 4548
        dispose: function() {
            console.error("Unimplemented");
        },

        // XXX CSA: more functions here

        // line 4747
        get real_has_overlaps() {
            /* By default we'll assume that all actors need an offscreen redirect to get
             * the correct opacity. Actors such as ClutterTexture that would never need
             * an offscreen redirect can override this to return FALSE. */
            return true;
        },

        // XXX CSA: more functions here

        // line 6368
        destroy: function() {
            console.error("Unimplemented");
        },

        // line 6394
        _finish_queue_redraw: function(clip) {
            console.assert(false, "Unimplemented");
        },

        // line 6464
        get _allocation_clip() {
            console.error("Unimplemented");
        },

        // line 6490
        _queue_redraw_full: function(flags, volume, effect) {
            var priv = this[PRIVATE];

            /* Here's an outline of the actor queue redraw mechanism:
             *
             * The process starts in one of the following two functions which
             * are wrappers for this function:
             * clutter_actor_queue_redraw
             * _clutter_actor_queue_redraw_with_clip
             *
             * additionally, an effect can queue a redraw by wrapping this
             * function in clutter_effect_queue_rerun
             *
             * This functions queues an entry in a list associated with the
             * stage which is a list of actors that queued a redraw while
             * updating the timelines, performing layouting and processing other
             * mainloop sources before the next paint starts.
             *
             * We aim to minimize the processing done at this point because
             * there is a good chance other events will happen while updating
             * the scenegraph that would invalidate any expensive work we might
             * otherwise try to do here. For example we don't try and resolve
             * the screen space bounding box of an actor at this stage so as to
             * minimize how much of the screen redraw because it's possible
             * something else will happen which will force a full redraw anyway.
             *
             * When all updates are complete and we come to paint the stage then
             * we iterate this list and actually emit the "queue-redraw" signals
             * for each of the listed actors which will bubble up to the stage
             * for each actor and at that point we will transform the actors
             * paint volume into screen coordinates to determine the clip region
             * for what needs to be redrawn in the next paint.
             *
             * Besides minimizing redundant work another reason for this
             * deferred design is that it's more likely we will be able to
             * determine the paint volume of an actor once we've finished
             * updating the scenegraph because its allocation should be up to
             * date. NB: If we can't determine an actors paint volume then we
             * can't automatically queue a clipped redraw which can make a big
             * difference to performance.
             *
             * So the control flow goes like this:
             * One of clutter_actor_queue_redraw,
             *        _clutter_actor_queue_redraw_with_clip
             *     or clutter_effect_queue_rerun
             *
             * then control moves to:
             *   _clutter_stage_queue_actor_redraw
             *
             * later during _clutter_stage_do_update, once relayouting is done
             * and the scenegraph has been updated we will call:
             * _clutter_stage_finish_queue_redraws
             *
             * _clutter_stage_finish_queue_redraws will call
             * _clutter_actor_finish_queue_redraw for each listed actor.
             * Note: actors *are* allowed to queue further redraws during this
             * process (considering clone actors or texture_new_from_actor which
             * respond to their source queueing a redraw by queuing a redraw
             * themselves). We repeat the process until the list is empty.
             *
             * This will result in the "queue-redraw" signal being fired for
             * each actor which will pass control to the default signal handler:
             * clutter_actor_real_queue_redraw
             *
             * This will bubble up to the stages handler:
             * clutter_stage_real_queue_redraw
             *
             * clutter_stage_real_queue_redraw will transform the actors paint
             * volume into screen space and add it as a clip region for the next
             * paint.
             */

            /* ignore queueing a redraw for actors being destroyed */
            if (this[PRIVATE].in_destruction) {
                return;
            }

            var stage = this._get_stage_internal();

            /* Ignore queueing a redraw for actors not descended from a stage */
            if (!stage) {
                return;
            }

            /* ignore queueing a redraw on stages that are being destroyed */
            if (stage[PRIVATE].in_destruction) {
                return;
            }

            var pv;
            if (flags & RedrawFlags.CLIPPED_TO_ALLOCATION) {

                /* If the actor doesn't have a valid allocation then we will
                 * queue a full stage redraw. */
                if (priv.needs_allocation) {
                    /* NB: NULL denotes an undefined clip which will result in a
                     * full redraw... */
                    this.queue_redraw_clip = null;
                    this._signal_queue_redraw(this);
                    return;
                }

                pv = new PaintVolume();
                pv.init(); // XXX CSA unnecessary?

                var allocation_clip = this._allocation_clip;
                var origin = new Vertex(allocation_clip.x1,
                                        allocation_clip.y1,
                                        0);
                pv.origin = origin;
                pv.width = allocation_clip.x2 - allocation_clip.x1;
                pv.height = allocation_clip.y2 - allocation_clip.y1;
            } else {
                pv = volume;
            }

            priv.queue_redraw_entry =
                stage._queue_actor_redraw(priv.queue_redraw_entry, this, pv);

            /* If this is the first redraw queued then we can directly use the
               effect parameter */
            if (!priv.is_dirty) {
                priv.effect_to_redraw = effect;
            }
            /* Otherwise we need to merge it with the existing effect parameter */
            else if (effect) {
                /* If there's already an effect then we need to use whichever is
                   later in the chain of actors. Otherwise a full redraw has
                   already been queued on the actor so we need to ignore the
                   effect parameter */
                if (priv.effect_to_redraw) {
                    if (!priv.effects) {
                        console.warn("Redraw queued with an effect that is "+
                                     "not applied to the actor");
                    } else {
                        // XXX CSA: probably use a JS list here, not a
                        //     emulation of a GList
                        var l;
                        for (l = priv.effects._peek_metas();
                             l;
                             l = l.next) {
                            if (l.data === priv.effect_to_redraw ||
                                l.data === effect) {
                                priv.effect_to_redraw = l.data;
                            }
                        }
                    }
                }
            } else {
                /* If no effect is specified then we need to redraw the whole
                   actor */
                priv.effect_to_redraw = null;
            }

            priv.is_dirty = true;
        },

/**
 * clutter_actor_queue_redraw:
 * @self: A #ClutterActor
 *
 * Queues up a redraw of an actor and any children. The redraw occurs
 * once the main loop becomes idle (after the current batch of events
 * has been processed, roughly).
 *
 * Applications rarely need to call this, as redraws are handled
 * automatically by modification functions.
 *
 * This function will not do anything if @self is not visible, or
 * if the actor is inside an invisible part of the scenegraph.
 *
 * Also be aware that painting is a NOP for actors with an opacity of
 * 0
 *
 * When you are implementing a custom actor you must queue a redraw
 * whenever some private state changes that will affect painting or
 * picking of your actor.
 */
// line 6694
        queue_redraw: function() {
            this._queue_redraw_full(0 /* flags */,
                                    null /* clip volume */,
                                    null /* effect */);
        },

/*< private >
 * _clutter_actor_queue_redraw_with_clip:
 * @self: A #ClutterActor
 * @flags: A mask of #ClutterRedrawFlags controlling the behaviour of
 *   this queue redraw.
 * @volume: A #ClutterPaintVolume describing the bounds of what needs to be
 *   redrawn or %NULL if you are just using a @flag to state your
 *   desired clipping.
 *
 * Queues up a clipped redraw of an actor and any children. The redraw
 * occurs once the main loop becomes idle (after the current batch of
 * events has been processed, roughly).
 *
 * If no flags are given the clip volume is defined by @volume
 * specified in actor coordinates and tells Clutter that only content
 * within this volume has been changed so Clutter can optionally
 * optimize the redraw.
 *
 * If the %CLUTTER_REDRAW_CLIPPED_TO_ALLOCATION @flag is used, @volume
 * should be %NULL and this tells Clutter to use the actor's current
 * allocation as a clip box. This flag can only be used for 2D actors,
 * because any actor with depth may be projected outside its
 * allocation.
 *
 * Applications rarely need to call this, as redraws are handled
 * automatically by modification functions.
 *
 * This function will not do anything if @self is not visible, or if
 * the actor is inside an invisible part of the scenegraph.
 *
 * Also be aware that painting is a NOP for actors with an opacity of
 * 0
 *
 * When you are implementing a custom actor you must queue a redraw
 * whenever some private state changes that will affect painting or
 * picking of your actor.
 */
// line 6742
        _queue_redraw_with_clip: function(flags, volume) {
            console.assert("Unimplemented");
        },

        // line 6753
        _queue_only_relayout: function() {
            var priv = this[PRIVATE];

            if (priv.in_destruction) {
                return;
            }

            if (priv.needs_width_request &&
                priv.needs_height_request &&
                priv.needs_allocation) {
                return; /* save some cpu cycles */
            }

            if (!priv.toplevel && priv.in_relayout) {
                console.warn("The actor is currently inside an allocation "+
                             "cycle; calling queue_relayout() is not "+
                             "recommended", this);
            }

            this.emit('queue-relayout');
            /* (invokes real_queue_relayout as a side-effect) */
        },
/**
 * clutter_actor_queue_redraw_with_clip:
 * @self: a #ClutterActor
 * @clip: (allow-none): a rectangular clip region, or %NULL
 *
 * Queues a redraw on @self limited to a specific, actor-relative
 * rectangular area.
 *
 * If @clip is %NULL this function is equivalent to
 * clutter_actor_queue_redraw().
 *
 * Since: 1.10
 */
// line 6792
        queue_redraw_with_clip: function(clip) {
            console.assert("Unimplemented");
        },
/**
 * clutter_actor_queue_relayout:
 * @self: A #ClutterActor
 *
 * Indicates that the actor's size request or other layout-affecting
 * properties may have changed. This function is used inside #ClutterActor
 * subclass implementations, not by applications directly.
 *
 * Queueing a new layout automatically queues a redraw as well.
 *
 * Since: 0.8
 */
// 6825
        queue_relayout: function() {
            this._queue_only_relayout();
            this.queue_redraw();
        },
/**
 * clutter_actor_get_preferred_size:
 * @self: a #ClutterActor
 * @min_width_p: (out) (allow-none): return location for the minimum
 *   width, or %NULL
 * @min_height_p: (out) (allow-none): return location for the minimum
 *   height, or %NULL
 * @natural_width_p: (out) (allow-none): return location for the natural
 *   width, or %NULL
 * @natural_height_p: (out) (allow-none): return location for the natural
 *   height, or %NULL
 *
 * Computes the preferred minimum and natural size of an actor, taking into
 * account the actor's geometry management (either height-for-width
 * or width-for-height).
 *
 * The width and height used to compute the preferred height and preferred
 * width are the actor's natural ones.
 *
 * If you need to control the height for the preferred width, or the width for
 * the preferred height, you should use clutter_actor_get_preferred_width()
 * and clutter_actor_get_preferred_height(), and check the actor's preferred
 * geometry management using the #ClutterActor:request-mode property.
 *
 * Since: 0.8
 */
// line 6869
        get preferred_size() {
            var priv = this[PRIVATE];
            var widths = {min_width:0, natural_width:0};
            var heights = {min_height:0, natural_height:0};

            if (priv.request_mode === Enums.RequestMode.HEIGHT_FOR_WIDTH) {
                Note.LAYOUT("Preferred size (height-for-width)");
                widths = this.get_preferred_width(null);
                heights = this.get_preferred_height(widths.natural_width);
            } else {
                Note.LAYOUT("Preferred size (width-for-height)");
                heights = this.get_preferred_height(null);
                widths = this.get_preferred_width(heights.natural_height);
            }
            return {
                min_width:      widths.min_width,
                natural_width:  widths.natural_width,
                min_height:     heights.min_height,
                natural_height: heights.natural_height
            };
        },
/*< private >
 * clutter_actor_adjust_width:
 * @self: a #ClutterActor
 * @minimum_width: (inout): the actor's preferred minimum width, which
 *   will be adjusted depending on the margin
 * @natural_width: (inout): the actor's preferred natural width, which
 *   will be adjusted depending on the margin
 * @adjusted_x1: (out): the adjusted x1 for the actor's bounding box
 * @adjusted_x2: (out): the adjusted x2 for the actor's bounding box
 *
 * Adjusts the preferred and allocated position and size of an actor,
 * depending on the margin and alignment properties.
 */
// line 7022
        _adjust_width: function(self1, MINIMUM_WIDTH, NATURAL_WIDTH,
                                self2, ADJUSTED_X1, ADJUSTED_X2) {
            var info = this._get_layout_info_or_defaults ();
            var text_dir = this.text_direction;

            Note.LAYOUT("Adjusting allocated X and width");
            /* this will tweak natural_width to remove the margin, so that
             * adjust_for_alignment() will use the correct size
             */
            adjust_for_margin(info.margin.left, info.margin.right,
                              self1, MINIMUM_WIDTH, NATURAL_WIDTH,
                              self2, ADJUSTED_X1, ADJUSTED_X2);

            adjust_for_alignment(effective_align(info.x_align, text_dir),
                                 self1[NATURAL_WIDTH],
                                 self2, ADJUSTED_X1, ADJUSTED_X2);
        },
/*< private >
 * clutter_actor_adjust_height:
 * @self: a #ClutterActor
 * @minimum_height: (inout): the actor's preferred minimum height, which
 *   will be adjusted depending on the margin
 * @natural_height: (inout): the actor's preferred natural height, which
 *   will be adjusted depending on the margin
 * @adjusted_y1: (out): the adjusted y1 for the actor's bounding box
 * @adjusted_y2: (out): the adjusted y2 for the actor's bounding box
 *
 * Adjusts the preferred and allocated position and size of an actor,
 * depending on the margin and alignment properties.
 */
// line 7062
        _adjust_height: function(self1, MINIMUM_HEIGHT, NATURAL_HEIGHT,
                                 self2, ADJUSTED_Y1, ADJUSTED_Y2) {
            var info = this._get_layout_info_or_defaults ();

            Note.LAYOUT("Adjusting allocated Y and height");

            /* this will tweak natural_height to remove the margin, so that
             * adjust_for_alignment() will use the correct size
             */
            adjust_for_margin (info.margin.top, info.margin.bottom,
                               self1, MINIMUM_HEIGHT, NATURAL_HEIGHT,
                               self2, ADJUSTED_Y1, ADJUSTED_Y2);

            /* we don't use effective_align() here, because text direction
             * only affects the horizontal axis
             */
            adjust_for_alignment (info.y_align,
                                  self1[NATURAL_HEIGHT],
                                  self2, ADJUSTED_Y1, ADJUSTED_Y2);
        },

/* looks for a cached size request for this for_size. If not
 * found, returns the oldest entry so it can be overwritten */
// line 7086
        _get_cached_size_request: function(for_size, cached_size_requests) {
            console.warn("cached_size_request unimplemented");
            return { valid: false };
        },
/**
 * clutter_actor_get_preferred_width:
 * @self: A #ClutterActor
 * @for_height: available height when computing the preferred width,
 *   or a negative value to indicate that no height is defined
 * @min_width_p: (out) (allow-none): return location for minimum width,
 *   or %NULL
 * @natural_width_p: (out) (allow-none): return location for the natural
 *   width, or %NULL
 *
 * Computes the requested minimum and natural widths for an actor,
 * optionally depending on the specified height, or if they are
 * already computed, returns the cached values.
 *
 * An actor may not get its request - depending on the layout
 * manager that's in effect.
 *
 * A request should not incorporate the actor's scale or anchor point;
 * those transformations do not affect layout, only rendering.
 *
 * Since: 0.8
 */
// line 7150
        get_preferred_width: function(for_height) {
            var priv = this[PRIVATE];
            var info = this._get_layout_info_or_defaults ();
            if (for_height < 0) { for_height=null; }

            /* we shortcircuit the case of a fixed size set using set_width() */
            if (priv.min_width_set && priv.natural_width_set) {
                var ttl_margin = info.margin.left + info.margin.right;
                return {
                    min_width: info.min_width + ttl_margin,
                    natural_width: info.natural_width + ttl_margin
                };
            }

            /* the remaining cases are:
             *
             *   - either min_width or natural_width have been set
             *   - neither min_width or natural_width have been set
             *
             * in both cases, we go through the cache (and through the actor in case
             * of cache misses) and determine the authoritative value depending on
             * the *_set flags.
             */
            var cached_size_request;
            if (!priv.needs_width_request) {
                cached_size_request =
                    this._get_cached_size_request(for_height,
                                                  priv.width_requests);
            } else {
                /* if the actor needs a width request we use the first slot */
                cached_size_request = priv.width_requests[0];
                cached_size_request.valid = false;
            }
            if (!cached_size_request.valid) {
                /* adjust for the margin */
                if (for_height !== null && for_height >= 0) {
                    for_height -= (info.margin.top + info.margin.bottom);
                    if (for_height < 0) {
                        for_height = 0;
                    }
                }

                Note.LAYOUT("Width request for", for_height, "px");
                // VIRTUAL METHOD INVOCATION [CSA]
                var widths = this.real_get_preferred_width(for_height);

                /* adjust for the margin */
                widths.min_width += (info.margin.left + info.margin.right);
                widths.natural_width += (info.margin.left + info.margin.right);

                /* Due to accumulated float errors, it's better not to warn
                 * on this, but just fix it.
                 */
                if (widths.natural_width < widths.min_width) {
                    widths.natural_width = widths.min_width;
                }

                cached_size_request.min_size = widths.min_width;
                cached_size_request.natural_size = widths.natural_width;
                cached_size_request.for_size = for_height;
                cached_size_request.age = priv.cached_width_age;
                cached_size_request.valid = true;

                priv.cached_width_age += 1;
                priv.needs_width_request = false;
            }

            var request_min_width, request_natural_width;
            if (!priv.min_width_set) {
                request_min_width = cached_size_request.min_size;
            } else {
                request_min_width = info.min_width;
            }
            if (!priv.natural_width_set) {
                request_natural_width = cached_size_request.natural_size;
            } else {
                request_natural_width = info.natural_width;
            }
            return {
                min_width: request_min_width,
                natural_width: request_natural_width
            };
        },
/**
 * clutter_actor_get_preferred_height:
 * @self: A #ClutterActor
 * @for_width: available width to assume in computing desired height,
 *   or a negative value to indicate that no width is defined
 * @min_height_p: (out) (allow-none): return location for minimum height,
 *   or %NULL
 * @natural_height_p: (out) (allow-none): return location for natural
 *   height, or %NULL
 *
 * Computes the requested minimum and natural heights for an actor,
 * or if they are already computed, returns the cached values.
 *
 * An actor may not get its request - depending on the layout
 * manager that's in effect.
 *
 * A request should not incorporate the actor's scale or anchor point;
 * those transformations do not affect layout, only rendering.
 *
 * Since: 0.8
 */
// line 7283
        get_preferred_height: function(for_width) {
            var priv = this[PRIVATE];
            var info = this._get_layout_info_or_defaults ();
            if (for_width < 0) { for_width=null; }

            /* we shortcircuit the case of a fixed size set using set_height() */
            if (priv.min_height_set && priv.natural_height_set) {
                var ttl_margin = info.margin.top + info.margin.bottom;
                return {
                    min_height: info.min_height + ttl_margin,
                    natural_height: info.natural_height + ttl_margin
                };
            }

            /* the remaining cases are:
             *
             *   - either min_height or natural_height have been set
             *   - neither min_height or natural_height have been set
             *
             * in both cases, we go through the cache (and through the actor in case
             * of cache misses) and determine the authoritative value depending on
             * the *_set flags.
             */
            var cached_size_request;
            if (!priv.needs_height_request) {
                cached_size_request =
                    this._get_cached_size_request(for_width,
                                                  priv.height_requests);
            } else {
                /* if the actor needs a height request we use the first slot */
                cached_size_request = priv.height_requests[0];
                cached_size_request.valid = false;
            }
            if (!cached_size_request.valid) {

                Note.LAYOUT("Height request for", for_width, "px");

                /* adjust for the margin */
                if (for_width!==null && for_width >= 0) {
                    for_width -= (info.margin.left + info.margin.right);
                    if (for_width < 0) {
                        for_width = 0;
                    }
                }

                // VIRTUAL METHOD INVOCATION [CSA]
                var heights = this.real_get_preferred_height(for_width);

                /* adjust for the margin */
                heights.min_height += (info.margin.top + info.margin.bottom);
                heights.natural_height += (info.margin.top + info.margin.bottom);

                /* Due to accumulated float errors, it's better not to warn
                 * on this, but just fix it.
                 */
                if (heights.natural_height < heights.min_height) {
                    heights.natural_height = heights.min_height;
                }

                cached_size_request.min_size = heights.min_height;
                cached_size_request.natural_size = heights.natural_height;
                cached_size_request.for_size = for_width;
                cached_size_request.age = priv.cached_height_age;
                cached_size_request.valid = true;

                priv.cached_height_age += 1;
                priv.needs_height_request = false;
            }

            var request_min_height, request_natural_height;
            if (!priv.min_height_set) {
                request_min_height = cached_size_request.min_size;
            } else {
                request_min_height = info.min_height;
            }
            if (!priv.natural_height_set) {
                request_natural_height = cached_size_request.natural_size;
            } else {
                request_natural_height = info.natural_height;
            }
            return {
                min_height: request_min_height,
                natural_height: request_natural_height
            };
        },
/**
 * clutter_actor_get_allocation_box:
 * @self: A #ClutterActor
 * @box: (out): the function fills this in with the actor's allocation
 *
 * Gets the layout box an actor has been assigned. The allocation can
 * only be assumed valid inside a paint() method; anywhere else, it
 * may be out-of-date.
 *
 * An allocation does not incorporate the actor's scale or anchor point;
 * those transformations do not affect layout, only rendering.
 *
 * <note>Do not call any of the clutter_actor_get_allocation_*() family
 * of functions inside the implementation of the get_preferred_width()
 * or get_preferred_height() virtual functions.</note>
 *
 * Since: 0.8
 */
// line 7412
        get allocation_box() {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_get_allocation_geometry:
 * @self: A #ClutterActor
 * @geom: (out): allocation geometry in pixels
 *
 * Gets the layout box an actor has been assigned.  The allocation can
 * only be assumed valid inside a paint() method; anywhere else, it
 * may be out-of-date.
 *
 * An allocation does not incorporate the actor's scale or anchor point;
 * those transformations do not affect layout, only rendering.
 *
 * The returned rectangle is in pixels.
 *
 * Since: 0.8
 */
// line 7462
        get allocation_geometry() {
            console.assert(false, "Unimplemented");
        },
// line 7479
        _update_constraints: function(allocation) {
            console.assert(false, "Unimplemented");
        },
/*< private >
 * clutter_actor_adjust_allocation:
 * @self: a #ClutterActor
 * @allocation: (inout): the allocation to adjust
 *
 * Adjusts the passed allocation box taking into account the actor's
 * layout information, like alignment, expansion, and margin.
 */
// line 7512
        _adjust_allocation: function(allocation) {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_allocate:
 * @self: A #ClutterActor
 * @box: new allocation of the actor, in parent-relative coordinates
 * @flags: flags that control the allocation
 *
 * Called by the parent of an actor to assign the actor its size.
 * Should never be called by applications (except when implementing
 * a container or layout manager).
 *
 * Actors can know from their allocation box whether they have moved
 * with respect to their parent actor. The @flags parameter describes
 * additional information about the allocation, for instance whether
 * the parent has moved with respect to the stage, for example because
 * a grandparent's origin has moved.
 *
 * Since: 0.8
 */
// line 7629
        allocate: function(box, flags) {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_set_allocation:
 * @self: a #ClutterActor
 * @box: a #ClutterActorBox
 * @flags: allocation flags
 *
 * Stores the allocation of @self as defined by @box.
 *
 * This function can only be called from within the implementation of
 * the #ClutterActorClass.allocate() virtual function.
 *
 * The allocation should have been adjusted to take into account constraints,
 * alignment, and margin properties. If you are implementing a #ClutterActor
 * subclass that provides its own layout management policy for its children
 * instead of using a #ClutterLayoutManager delegate, you should not call
 * this function on the children of @self; instead, you should call
 * clutter_actor_allocate(), which will adjust the allocation box for
 * you.
 *
 * This function should only be used by subclasses of #ClutterActor
 * that wish to store their allocation but cannot chain up to the
 * parent's implementation; the default implementation of the
 * #ClutterActorClass.allocate() virtual function will call this
 * function.
 *
 * It is important to note that, while chaining up was the recommended
 * behaviour for #ClutterActor subclasses prior to the introduction of
 * this function, it is recommended to call clutter_actor_set_allocation()
 * instead.
 *
 * If the #ClutterActor is using a #ClutterLayoutManager delegate object
 * to handle the allocation of its children, this function will call
 * the clutter_layout_manager_allocate() function.
 *
 * Since: 1.10
 */
// line 7763
        set_allocation: function(box, flags) {
            console.assert("Unimplemented");
        },
/**
 * clutter_actor_set_geometry:
 * @self: A #ClutterActor
 * @geometry: A #ClutterGeometry
 *
 * Sets the actor's fixed position and forces its minimum and natural
 * size, in pixels. This means the untransformed actor will have the
 * given geometry. This is the same as calling clutter_actor_set_position()
 * and clutter_actor_set_size().
 *
 * Deprecated: 1.10: Use clutter_actor_set_position() and
 *   clutter_actor_set_size() instead.
 */
// line 7816
        set geometry(geometry) {
            this.freeze_notify();

            this.position = geometry; // x and y properties
            this.size = geometry;     // width and height properties

            this.thaw_notify();
        },
/**
 * clutter_actor_get_geometry:
 * @self: A #ClutterActor
 * @geometry: (out caller-allocates): A location to store actors #ClutterGeometry
 *
 * Gets the size and position of an actor relative to its parent
 * actor. This is the same as calling clutter_actor_get_position() and
 * clutter_actor_get_size(). It tries to "do what you mean" and get the
 * requested size and position if the actor's allocation is invalid.
 *
 * Deprecated: 1.10: Use clutter_actor_get_position() and
 *   clutter_actor_get_size(), or clutter_actor_get_allocation_geometry()
 *   instead.
 */
// line 7842
        get geometry() {
            var position = this.position;
            var size = this.size;
            return {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height
            };
        },
/**
 * clutter_actor_set_position
 * @self: A #ClutterActor
 * @x: New left position of actor in pixels.
 * @y: New top position of actor in pixels.
 *
 * Sets the actor's fixed position in pixels relative to any parent
 * actor.
 *
 * If a layout manager is in use, this position will override the
 * layout manager and force a fixed position.
 */
// line 7872
        set position(position) {
            this.freeze_notify();

            this.x = position.x;
            this.y = position.y;

            this.thaw_notify();
        },

/**
 * clutter_actor_get_fixed_position_set:
 * @self: A #ClutterActor
 *
 * Checks whether an actor has a fixed position set (and will thus be
 * unaffected by any layout manager).
 *
 * Return value: %TRUE if the fixed position is set on the actor
 *
 * Since: 0.8
 */
// line 7898
        get fixed_position_set() {
            return !!this[PRIVATE].position_set;
        },

/**
 * clutter_actor_set_fixed_position_set:
 * @self: A #ClutterActor
 * @is_set: whether to use fixed position
 *
 * Sets whether an actor has a fixed position set (and will thus be
 * unaffected by any layout manager).
 *
 * Since: 0.8
 */
// line 7915
        set fixed_position_set(is_set) {
            if ((!this[PRIVATE].position_set) === (!is_set)) {
                return;
            }
            this[PRIVATE].position_set = !!is_set;
            this.notify('fixed_position_set');
            this.queue_relayout();
        },

/**
 * clutter_actor_move_by:
 * @self: A #ClutterActor
 * @dx: Distance to move Actor on X axis.
 * @dy: Distance to move Actor on Y axis.
 *
 * Moves an actor by the specified distance relative to its current
 * position in pixels.
 *
 * This function modifies the fixed position of an actor and thus removes
 * it from any layout management. Another way to move an actor is with an
 * anchor point, see clutter_actor_set_anchor_point().
 *
 * Since: 0.2
 */
// line 7946
        move_by: function(dx, dy) {
            var info = this._get_layout_info_or_defaults();
            var x = info.fixed_x;
            var y = info.fixed_y;

            this.position = { x: x+dx, y: y+dy };
        },

        // line 7963
        set min_width(min_width) {
            var priv = this[PRIVATE];

            /* if we are setting the size on a top-level actor and the
             * backend only supports static top-levels (e.g. framebuffers)
             * then we ignore the passed value and we override it with
             * the stage implementation's preferred size.
             */
            if (priv.toplevel &&
                Feature.available(Feature.STAGE_STATIC)) {
                return;
            }
            var info = this._get_layout_info();

            if (priv.min_width_set && min_width === info.min_width) {
                return;
            }

            this.freeze_notify();

            var old = this._store_old_geometry();

            info.min_width = min_width;
            priv.min_width_set = true;
            this.notify('min_width');
            this.notify('min_width_set');

            this._notify_if_geometry_changed(old);

            this.thaw_notify();

            this.queue_relayout();
        },

        // line 8001
        set min_height(min_height) {
            var priv = this[PRIVATE];

            /* if we are setting the size on a top-level actor and the
             * backend only supports static top-levels (e.g. framebuffers)
             * then we ignore the passed value and we override it with
             * the stage implementation's preferred size.
             */
            if (priv.toplevel &&
                Feature.available(Feature.STAGE_STATIC)) {
                return;
            }
            var info = this._get_layout_info();

            if (priv.min_height_set && min_height === info.min_height) {
                return;
            }

            this.freeze_notify();

            var old = this._store_old_geometry();

            info.min_height = min_height;
            priv.min_height_set = true;
            this.notify('min_height');
            this.notify('min_height_set');

            this._notify_if_geometry_changed(old);

            this.thaw_notify();

            this.queue_relayout();
        },

        // line 8040
        set natural_width(natural_width) {
            var priv = this[PRIVATE];

            /* if we are setting the size on a top-level actor and the
             * backend only supports static top-levels (e.g. framebuffers)
             * then we ignore the passed value and we override it with
             * the stage implementation's preferred size.
             */
            if (priv.toplevel &&
                Feature.available(Feature.STAGE_STATIC)) {
                return;
            }
            var info = this._get_layout_info();

            if (priv.natural_width_set && natural_width === info.natural_width) {
                return;
            }

            this.freeze_notify();

            var old = this._store_old_geometry();

            info.natural_width = natural_width;
            priv.natural_width_set = true;
            this.notify('natural_width');
            this.notify('natural_width_set');

            this._notify_if_geometry_changed(old);

            this.thaw_notify();

            this.queue_relayout();
        },

        // line 8078
        set natural_height(natural_height) {
            var priv = this[PRIVATE];

            /* if we are setting the size on a top-level actor and the
             * backend only supports static top-levels (e.g. framebuffers)
             * then we ignore the passed value and we override it with
             * the stage implementation's preferred size.
             */
            if (priv.toplevel &&
                Feature.available(Feature.STAGE_STATIC)) {
                return;
            }
            var info = this._get_layout_info();

            if (priv.natural_height_set && natural_height === info.natural_height) {
                return;
            }

            this.freeze_notify();

            var old = this._store_old_geometry();

            info.natural_height = natural_height;
            priv.natural_height_set = true;
            this.notify('natural_height');
            this.notify('natural_height_set');

            this._notify_if_geometry_changed(old);

            this.thaw_notify();

            this.queue_relayout();
        },

        // line 8115
        set min_width_set(use_min_width) {
            var priv = this[PRIVATE];
            use_min_width = !!use_min_width;

            if (priv.min_width_set === use_min_width) {
                return;
            }

            var old = this._store_old_geometry();

            priv.min_width_set = use_min_width;
            this.notify('min_width_set');

            this._notify_if_geometry_changed(old);

            this.queue_relayout();
        },

        // line 8135
        set min_height_set(use_min_height) {
            var priv = this[PRIVATE];
            use_min_height = !!use_min_height;

            if (priv.min_height_set === use_min_height) {
                return;
            }

            var old = this._store_old_geometry();

            priv.min_height_set = use_min_height;
            this.notify('min_height_set');

            this._notify_if_geometry_changed(old);

            this.queue_relayout();
        },

        // line 8155
        set natural_width_set(use_natural_width) {
            var priv = this[PRIVATE];
            use_natural_width = !!use_natural_width;

            if (priv.natural_width_set === use_natural_width) {
                return;
            }

            var old = this._store_old_geometry();

            priv.natural_width_set = use_natural_width;
            this.notify('natural_width_set');

            this._notify_if_geometry_changed(old);

            this.queue_relayout();
        },

        // line 8175
        set natural_height_set(use_natural_height) {
            var priv = this[PRIVATE];
            use_natural_height = !!use_natural_height;

            if (priv.natural_height_set === use_natural_height) {
                return;
            }

            var old = this._store_old_geometry();

            priv.natural_height_set = use_natural_height;
            this.notify('natural_height_set');

            this._notify_if_geometry_changed(old);

            this.queue_relayout();
        },

/**
 * clutter_actor_set_request_mode:
 * @self: a #ClutterActor
 * @mode: the request mode
 *
 * Sets the geometry request mode of @self.
 *
 * The @mode determines the order for invoking
 * clutter_actor_get_preferred_width() and
 * clutter_actor_get_preferred_height()
 *
 * Since: 1.2
 */
        // line 8208
        set request_mode(mode) {
            var priv = this[PRIVATE];

            if (priv.request_mode === mode) {
                return;
            }

            priv.request_mode = mode;

            priv.needs_width_request = true;
            priv.needs_height_request = true;

            this.notify('request_mode');

            this.queue_relayout();
        },

/**
 * clutter_actor_get_request_mode:
 * @self: a #ClutterActor
 *
 * Retrieves the geometry request mode of @self
 *
 * Return value: the request mode for the actor
 *
 * Since: 1.2
 */
// line 8241
        get request_mode() {
            return this[PRIVATE].request_mode;
        },

/* variant of set_width() without checks and without notification
 * freeze+thaw, for internal usage only
 */
// line 8253
        _set_width_internal: function(width) {
            console.assert(width !== undefined);
            if (width!==null && width >= 0) {
                /* the Stage will use the :min-width to control the minimum
                 * width to be resized to, so we should not be setting it
                 * along with the :natural-width
                 */
                if (!this[PRIVATE].toplevel) {
                    this.min_width = width;
                }

                this.natural_width = width;
            } else {
                /* we only unset the :natural-width for the Stage */
                if (!this[PRIVATE].toplevel) {
                    this.min_width_set = false;
                }

                this.natural_width_set = false;
            }
        },

/* variant of set_height() without checks and without notification
 * freeze+thaw, for internal usage only
 */
// line 8281
        _set_height_internal: function(height) {
            console.assert(height !== undefined);
            if (height!==null && height >= 0) {
                /* see the comment above in set_width_internal() */
                if (!this[PRIVATE].toplevel) {
                    this.min_height = height;
                }

                this.natural_height = height;
            } else {
                /* see the comment above in set_width_internal() */
                if (!this[PRIVATE].toplevel) {
                    this.min_height_set = false;
                }

                this.natural_height_set = false;
            }
        },

/**
 * clutter_actor_set_size
 * @self: A #ClutterActor
 * @width: New width of actor in pixels, or -1
 * @height: New height of actor in pixels, or -1
 *
 * Sets the actor's size request in pixels. This overrides any
 * "normal" size request the actor would have. For example
 * a text actor might normally request the size of the text;
 * this function would force a specific size instead.
 *
 * If @width and/or @height are -1 the actor will use its
 * "normal" size request instead of overriding it, i.e.
 * you can "unset" the size with -1.
 *
 * This function sets or unsets both the minimum and natural size.
 */
// line 8317
        set size(size) {
            this.freeze_notify();
            this._set_width_internal(size.width);
            this._set_height_internal(size.height);
            this.thaw_notify();
        },
/**
 * clutter_actor_get_size:
 * @self: A #ClutterActor
 * @width: (out) (allow-none): return location for the width, or %NULL.
 * @height: (out) (allow-none): return location for the height, or %NULL.
 *
 * This function tries to "do what you mean" and return
 * the size an actor will have. If the actor has a valid
 * allocation, the allocation will be returned; otherwise,
 * the actors natural size request will be returned.
 *
 * If you care whether you get the request vs. the allocation, you
 * should probably call a different function like
 * clutter_actor_get_allocation_box() or
 * clutter_actor_get_preferred_width().
 *
 * Since: 0.2
 */
// line 8350
        get size() {
            return { width: this.width, height: this.height };
        },

/**
 * clutter_actor_get_position:
 * @self: a #ClutterActor
 * @x: (out) (allow-none): return location for the X coordinate, or %NULL
 * @y: (out) (allow-none): return location for the Y coordinate, or %NULL
 *
 * This function tries to "do what you mean" and tell you where the
 * actor is, prior to any transformations. Retrieves the fixed
 * position of an actor in pixels, if one has been set; otherwise, if
 * the allocation is valid, returns the actor's allocated position;
 * otherwise, returns 0,0.
 *
 * The returned position is in pixels.
 *
 * Since: 0.6
 */
// line 8380
        get position() {
            return { x: this.x, y: this.y };
        },
/**
 * clutter_actor_get_transformed_position:
 * @self: A #ClutterActor
 * @x: (out) (allow-none): return location for the X coordinate, or %NULL
 * @y: (out) (allow-none): return location for the Y coordinate, or %NULL
 *
 * Gets the absolute position of an actor, in pixels relative to the stage.
 *
 * Since: 0.8
 */
// line 8404
        get transformed_position() {
            var v1 = new Vertex(0,0,0);
            var v2 = this.apply_transform_to_point();
            return v2;
        },
/**
 * clutter_actor_get_transformed_size:
 * @self: A #ClutterActor
 * @width: (out) (allow-none): return location for the width, or %NULL
 * @height: (out) (allow-none): return location for the height, or %NULL
 *
 * Gets the absolute size of an actor in pixels, taking into account the
 * scaling factors.
 *
 * If the actor has a valid allocation, the allocated size will be used.
 * If the actor has not a valid allocation then the preferred size will
 * be transformed and returned.
 *
 * If you want the transformed allocation, see
 * clutter_actor_get_abs_allocation_vertices() instead.
 *
 * <note>When the actor (or one of its ancestors) is rotated around the
 * X or Y axis, it no longer appears as on the stage as a rectangle, but
 * as a generic quadrangle; in that case this function returns the size
 * of the smallest rectangle that encapsulates the entire quad. Please
 * note that in this case no assumptions can be made about the relative
 * position of this envelope to the absolute position of the actor, as
 * returned by clutter_actor_get_transformed_position(); if you need this
 * information, you need to use clutter_actor_get_abs_allocation_vertices()
 * to get the coords of the actual quadrangle.</note>
 *
 * Since: 0.8
 */
// line 8450
        get transformed_size() {
            console.assert(false, "Unimplemented");
        },
/**
 * clutter_actor_get_width:
 * @self: A #ClutterActor
 *
 * Retrieves the width of a #ClutterActor.
 *
 * If the actor has a valid allocation, this function will return the
 * width of the allocated area given to the actor.
 *
 * If the actor does not have a valid allocation, this function will
 * return the actor's natural width, that is the preferred width of
 * the actor.
 *
 * If you care whether you get the preferred width or the width that
 * has been assigned to the actor, you should probably call a different
 * function like clutter_actor_get_allocation_box() to retrieve the
 * allocated size or clutter_actor_get_preferred_width() to retrieve the
 * preferred width.
 *
 * If an actor has a fixed width, for instance a width that has been
 * assigned using clutter_actor_set_width(), the width returned will
 * be the same value.
 *
 * Return value: the width of the actor, in pixels
 */
// line 8543
        get width() {
            if (this[PRIVATE].needs_allocation) {
                var natural_height = null;
                if (this[PRIVATE].request_mode !== Enums.RequestMode.HEIGHT_FOR_WIDTH) {
                    natural_height = this.get_preferred_height(null).natural_height;
                }
                return this.get_preferred_width(natural_height).natural_width;
            }
            return this[PRIVATE].allocation.x2 - this[PRIVATE].allocation.x1;
        },
/**
 * clutter_actor_get_height:
 * @self: A #ClutterActor
 *
 * Retrieves the height of a #ClutterActor.
 *
 * If the actor has a valid allocation, this function will return the
 * height of the allocated area given to the actor.
 *
 * If the actor does not have a valid allocation, this function will
 * return the actor's natural height, that is the preferred height of
 * the actor.
 *
 * If you care whether you get the preferred height or the height that
 * has been assigned to the actor, you should probably call a different
 * function like clutter_actor_get_allocation_box() to retrieve the
 * allocated size or clutter_actor_get_preferred_height() to retrieve the
 * preferred height.
 *
 * If an actor has a fixed height, for instance a height that has been
 * assigned using clutter_actor_set_height(), the height returned will
 * be the same value.
 *
 * Return value: the height of the actor, in pixels
 */
// line 8599
        get height() {
            if (this[PRIVATE].needs_allocation) {
                var natural_width = null;
                if (this[PRIVATE].request_mode === Enums.RequestMode.HEIGHT_FOR_WIDTH) {
                    natural_width = this.get_preferred_width(null).natural_width;
                }
                return this.get_preferred_height(natural_width).natural_height;
            }
            return this[PRIVATE].allocation.y2 - this[PRIVATE].allocation.y1;
        },
/**
 * clutter_actor_set_width
 * @self: A #ClutterActor
 * @width: Requested new width for the actor, in pixels, or -1
 *
 * Forces a width on an actor, causing the actor's preferred width
 * and height (if any) to be ignored.
 *
 * If @width is -1 the actor will use its preferred width request
 * instead of overriding it, i.e. you can "unset" the width with -1.
 *
 * This function sets both the minimum and natural size of the actor.
 *
 * since: 0.2
 */
// line 8644
        set width(width) {
            this.freeze_notify();
            this._set_width_internal(width);
            this.thaw_notify();
        },
/**
 * clutter_actor_set_height
 * @self: A #ClutterActor
 * @height: Requested new height for the actor, in pixels, or -1
 *
 * Forces a height on an actor, causing the actor's preferred width
 * and height (if any) to be ignored.
 *
 * If @height is -1 the actor will use its preferred height instead of
 * overriding it, i.e. you can "unset" the height with -1.
 *
 * This function sets both the minimum and natural size of the actor.
 *
 * since: 0.2
 */
// line 8672
        set height(height) {
            this.freeze_notify();
            this._set_height_internal(height);
            this.thaw_notify();
        },
/**
 * clutter_actor_set_x:
 * @self: a #ClutterActor
 * @x: the actor's position on the X axis
 *
 * Sets the actor's X coordinate, relative to its parent, in pixels.
 *
 * Overrides any layout manager and forces a fixed position for
 * the actor.
 *
 * Since: 0.6
 */
// line 8697
        set x(x) {
            var info = this._layout_info;
            if (this[PRIVATE].position_set && info.fixed_x === x) {
                return;
            }
            var old = this._store_old_geometry();
            info.fixed_x = x;
            this.fixed_position_set = true;
            this._notify_if_geometry_changed(old);
            this.queue_relayout();
        },
/**
 * clutter_actor_set_y:
 * @self: a #ClutterActor
 * @y: the actor's position on the Y axis
 *
 * Sets the actor's Y coordinate, relative to its parent, in pixels.#
 *
 * Overrides any layout manager and forces a fixed position for
 * the actor.
 *
 * Since: 0.6
 */
// line 8736
        set y(y) {
            var info = this._layout_info;
            if (this[PRIVATE].position_set && info.fixed_y === y) {
                return;
            }
            var old = this._store_old_geometry();
            info.fixed_y = y;
            this.fixed_position_set = true;
            this._notify_if_geometry_changed(old);
            this.queue_relayout();
        },
/**
 * clutter_actor_get_x
 * @self: A #ClutterActor
 *
 * Retrieves the X coordinate of a #ClutterActor.
 *
 * This function tries to "do what you mean", by returning the
 * correct value depending on the actor's state.
 *
 * If the actor has a valid allocation, this function will return
 * the X coordinate of the origin of the allocation box.
 *
 * If the actor has any fixed coordinate set using clutter_actor_set_x(),
 * clutter_actor_set_position() or clutter_actor_set_geometry(), this
 * function will return that coordinate.
 *
 * If both the allocation and a fixed position are missing, this function
 * will return 0.
 *
 * Return value: the X coordinate, in pixels, ignoring any
 *   transformation (i.e. scaling, rotation)
 */
        get x() {
            var info;
            if (this[PRIVATE].needs_allocation) {
                if (this[PRIVATE].position_set) {
                    info = this._get_layout_info_or_defaults();
                    return info.fixed_x;
                } else {
                    return 0;
                }
            } else {
                return this[PRIVATE].allocation.x1;
            }
        },
/**
 * clutter_actor_get_y
 * @self: A #ClutterActor
 *
 * Retrieves the Y coordinate of a #ClutterActor.
 *
 * This function tries to "do what you mean", by returning the
 * correct value depending on the actor's state.
 *
 * If the actor has a valid allocation, this function will return
 * the Y coordinate of the origin of the allocation box.
 *
 * If the actor has any fixed coordinate set using clutter_actor_set_y(),
 * clutter_actor_set_position() or clutter_actor_set_geometry(), this
 * function will return that coordinate.
 *
 * If both the allocation and a fixed position are missing, this function
 * will return 0.
 *
 * Return value: the Y coordinate, in pixels, ignoring any
 *   transformation (i.e. scaling, rotation)
 */
        get y() {
            var info;
            if (this[PRIVATE].needs_allocation) {
                if (this[PRIVATE].position_set) {
                    info = this._get_layout_info_or_defaults();
                    return info.fixed_y;
                } else {
                    return 0;
                }
            } else {
                return this[PRIVATE].allocation.y1;
            }
        },
/**
 * clutter_actor_set_scale:
 * @self: A #ClutterActor
 * @scale_x: double factor to scale actor by horizontally.
 * @scale_y: double factor to scale actor by vertically.
 *
 * Scales an actor with the given factors. The scaling is relative to
 * the scale center and the anchor point. The scale center is
 * unchanged by this function and defaults to 0,0.
 *
 * Since: 0.2
 */
        set scale(scale) {
            this.freeze_notify();

            this.set_scale_factor(Enums.RotateAxis.X_AXIS, scale.x);
            this.set_scale_factor(Enums.RotateAxis.Y_AXIS, scale.y);

            this.thaw_notify();
        },
/**
 * clutter_actor_set_scale_full:
 * @self: A #ClutterActor
 * @scale_x: double factor to scale actor by horizontally.
 * @scale_y: double factor to scale actor by vertically.
 * @center_x: X coordinate of the center of the scale.
 * @center_y: Y coordinate of the center of the scale
 *
 * Scales an actor with the given factors around the given center
 * point. The center point is specified in pixels relative to the
 * anchor point (usually the top left corner of the actor).
 *
 * Since: 1.0
 */
        set_scale_full: function(scale, center) {
            this.freeze_notify();

            this.set_scale_factor(Enums.RotateAxis.X_AXIS, scale.x);
            this.set_scale_factor(Enums.RotateAxis.Y_AXIS, scale.y);
            this.set_scale_center(Enums.RotateAxis.X_AXIS, center.x);
            this.set_scale_center(Enums.RotateAxis.Y_AXIS, center.y);

            this.thaw_notify();
        },

/**
 * clutter_actor_set_name:
 * @self: A #ClutterActor
 * @name: Textual tag to apply to actor
 *
 * Sets the given name to @self. The name can be used to identify
 * a #ClutterActor.
 */
// line 9301
        set name(name) {
            this[PRIVATE].name = name;
            this.notify('name');
        },
/**
 * clutter_actor_get_name:
 * @self: A #ClutterActor
 *
 * Retrieves the name of @self.
 *
 * Return value: the name of the actor, or %NULL. The returned string is
 *   owned by the actor and should not be modified or freed.
 */
// line 9322
        get name() {
            return this[PRIVATE].name;
        },

/**
 * clutter_actor_set_depth:
 * @self: a #ClutterActor
 * @depth: Z co-ord
 *
 * Sets the Z coordinate of @self to @depth.
 *
 * The unit used by @depth is dependant on the perspective setup. See
 * also clutter_stage_set_perspective().
 */
// line 9360
        set depth(depth) {
            var priv = this[PRIVATE];
            if (priv.z !== depth) {
                /* Sets Z value - XXX 2.0: should we invert? */
                priv.z = depth;

                priv.transform_valid = false;

                /* FIXME - remove this crap; sadly, there are still containers
                 * in Clutter that depend on this utter brain damage
                 */
                // XXX CSA disabled.  is it safe?
                //this.sort_depth_order();

                this.queue_redraw();

                this.notify('depth');
            }
        },

/**
 * clutter_actor_get_depth:
 * @self: a #ClutterActor
 *
 * Retrieves the depth of @self.
 *
 * Return value: the depth of the actor
 */
// line 9396
        get depth() {
            return this[PRIVATE].z;
        },

        // XXX CSA XXX GAP HERE XXX

/**
 * clutter_actor_set_clip:
 * @self: A #ClutterActor
 * @xoff: X offset of the clip rectangle
 * @yoff: Y offset of the clip rectangle
 * @width: Width of the clip rectangle
 * @height: Height of the clip rectangle
 *
 * Sets clip area for @self. The clip area is always computed from the
 * upper left corner of the actor, even if the anchor point is set
 * otherwise.
 *
 * Since: 0.6
 */
// line 9590
        set clip(clip) {
            var priv = this[PRIVATE];
            if (priv.has_clip && Geometry.equals(priv.clip, clip)) {
                return;
            }
            priv.clip.set_from_geometry(clip);
            priv.has_clip = true;

            this.queue_redraw();
            this.notify('has_clip');
            this.notify('clip');
        },

/**
 * clutter_actor_remove_clip
 * @self: A #ClutterActor
 *
 * Removes clip area from @self.
 */
// line 9629
        remove_clip: function() {
            if (!this[PRIVATE].has_clip) {
                return;
            }
            this[PRIVATE].has_clip = false;
            this.queue_redraw();
            this.notify('has_clip');
        },

/**
 * clutter_actor_has_clip:
 * @self: a #ClutterActor
 *
 * Determines whether the actor has a clip area set or not.
 *
 * Return value: %TRUE if the actor has a clip area set.
 *
 * Since: 0.1.1
 */
// line 9654
        get has_clip() {
            return !!this[PRIVATE].has_clip;
        },

/**
 * clutter_actor_get_clip:
 * @self: a #ClutterActor
 * @xoff: (out) (allow-none): return location for the X offset of
 *   the clip rectangle, or %NULL
 * @yoff: (out) (allow-none): return location for the Y offset of
 *   the clip rectangle, or %NULL
 * @width: (out) (allow-none): return location for the width of
 *   the clip rectangle, or %NULL
 * @height: (out) (allow-none): return location for the height of
 *   the clip rectangle, or %NULL
 *
 * Gets the clip area for @self, if any is set
 *
 * Since: 0.6
 */
// line 9678
        get clip() {
            if (!this[PRIVATE].has_clip) { return null; }
            // XXX CSA: there's rounding in the get-property version of this
            var clip = this[PRIVATE].clip;
            return new Geometry(clip.x,
                                clip.y,
                                clip.width,
                                clip.height);
        },
/**
 * clutter_actor_get_children:
 * @self: a #ClutterActor
 *
 * Retrieves the list of children of @self.
 *
 * Return value: (transfer container) (element-type ClutterActor): A newly
 *   allocated #GList of #ClutterActor<!-- -->s. Use g_list_free() when
 *   done.
 *
 * Since: 1.10
 */
// line 9719
        get children() {
            var result = [];
            this._foreach_child(function() { result.push(this); });
            return result;
        },

/*< private >
 * insert_child_at_depth:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 *
 * Inserts @child inside the list of children held by @self, using
 * the depth as the insertion criteria.
 *
 * This sadly makes the insertion not O(1), but we can keep the
 * list sorted so that the painters algorithm we use for painting
 * the children will work correctly.
 */
        _insert_child_at_depth: function(child) {
            var priv = this[PRIVATE];
            var iter, tmp;

            child[PRIVATE].parent = this;

            /* special-case the first child */
            if (priv.n_children === 0) {
                priv.first_child = child;
                priv.last_child = child;
                return;
            }

            /* Find the right place to insert the child so that it will still be
               sorted and the child will be after all of the actors at the same
               dept */
            for (iter = priv.first_child;
                 iter;
                 iter = iter[PRIVATE].next_sibling) {
                if (iter[PRIVATE].z > child[PRIVATE].z) {
                    break;
                }
            }

            if (iter) {
                tmp = iter[PRIVATE].prev_sibling;

                if (tmp) {
                    tmp[PRIVATE].next_sibling = child;
                }

                /* Insert the node before the found one */
                child[PRIVATE].prev_sibling = iter[PRIVATE].prev_sibling;
                child[PRIVATE].next_sibling = iter;
                iter[PRIVATE].prev_sibling = child;
            } else {
                tmp = this[PRIVATE].last_child;

                if (tmp) {
                    tmp[PRIVATE].next_sibling = child;
                }

                /* insert the node at the end of the list */
                child[PRIVATE].prev_sibling = this[PRIVATE].last_child;
                child[PRIVATE].next_sibling = null;
            }

            if (!child[PRIVATE].prev_sibling) {
                this[PRIVATE].first_child = child;
            }

            if (!child[PRIVATE].next_sibling) {
                this[PRIVATE].last_child = child;
            }
        },

        _insert_child_at_index: function(child, index_) {
            var tmp;

            child[PRIVATE].parent = this;

            if (index_ === 0) {
                tmp = this[PRIVATE].first_child;

                if (tmp) {
                    tmp[PRIVATE].prev_sibling = child;
                }

                child[PRIVATE].prev_sibling = null;
                child[PRIVATE].next_sibling = tmp;
            } else if (index_ < 0 || index_ === this[PRIVATE].n_children) {
                // XXX CSA broken upstream (missing the ==n_children case)
                tmp = this[PRIVATE].last_child;

                if (tmp) {
                    tmp[PRIVATE].next_sibling = child;
                }

                child[PRIVATE].prev_sibling = tmp;
                child[PRIVATE].next_sibling = null;
            } else {
                var iter, i;
                for (iter = this[PRIVATE].first_child, i = 0;
                     iter;
                     iter = iter[PRIVATE].next_sibling, i += 1) {
                    if (index_ === i) {
                        tmp = iter[PRIVATE].prev_sibling;

                        child[PRIVATE].prev_sibling =tmp;
                        child[PRIVATE].next_sibling =iter;

                        iter[PRIVATE].prev_sibling = child;

                        if (tmp) {
                            tmp[PRIVATE].next_sibling = child;
                        }

                        break;
                    }
                }
            }

            if (!child[PRIVATE].prev_sibling) {
                this[PRIVATE].first_child = child;
            }

            if (!child[PRIVATE].next_sibling) {
                this[PRIVATE].last_child = child;
            }
        },

        _insert_child_above: function(child, sibling) {
            var tmp;

            child[PRIVATE].parent = this;

            if (!sibling) {
                sibling = this[PRIVATE].last_child;
            }

            child[PRIVATE].prev_sibling = sibling;

            if (sibling) {
                tmp = sibling[PRIVATE].next_sibling;

                child[PRIVATE].next_sibling = tmp;

                if (tmp) {
                    tmp[PRIVATE].prev_sibling = child;
                }

                sibling[PRIVATE].next_sibling = child;
            } else {
                child[PRIVATE].next_sibling = null;
            }

            if (!child[PRIVATE].prev_sibling) {
                this[PRIVATE].first_child = child;
            }

            if (!child[PRIVATE].next_sibling) {
                this[PRIVATE].last_child = child;
            }
        },

        _insert_child_below: function(child, sibling) {
            var tmp;

            child[PRIVATE].parent = this;

            if (!sibling) {
                sibling = this[PRIVATE].first_child;
            }

            child[PRIVATE].next_sibling = sibling;

            if (sibling) {
                tmp = sibling[PRIVATE].prev_sibling;

                child[PRIVATE].prev_sibling = tmp;

                if (tmp) {
                    tmp[PRIVATE].next_sibling = child;
                }

                sibling[PRIVATE].prev_sibling = child;
            } else {
                child[PRIVATE].prev_sibling = null;
            }

            if (!child[PRIVATE].prev_sibling) {
                this[PRIVATE].first_child = child;
            }

            if (!child[PRIVATE].next_sibling) {
                this[PRIVATE].last_child = child;
            }
        },

/*< private >
 * clutter_actor_add_child_internal:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 * @flags: control flags for actions
 * @add_func: delegate function
 * @data: (closure): data to pass to @add_func
 *
 * Adds @child to the list of children of @self.
 *
 * The actual insertion inside the list is delegated to @add_func: this
 * function will just set up the state, perform basic checks, and emit
 * signals.
 *
 * The @flags argument is used to perform additional operations.
 */
        _add_child_internal: function(child, flags, add_func) {
            if (child[PRIVATE].parent) {
                console.warn("Cannot set a parent on an actor which has a "+
                             "parent. You must use Actor.remove_child() "+
                             "first.");
                return;
            }
            if (child[PRIVATE].toplevel) {
                console.warn("Cannot set a parent on a toplevel actor");
                return;
            }
            if (child[PRIVATE].in_destruction) {
                console.warn("Cannot set a parent while currently being "+
                             "destroyed");
                return;
            }

            var create_meta =      !!(flags & AddChildFlags.CREATE_META);
            var emit_parent_set =  !!(flags & AddChildFlags.EMIT_PARENT_SET);
            var emit_actor_added = !!(flags & AddChildFlags.EMIT_ACTOR_ADDED);
            var check_state =      !!(flags & AddChildFlags.CHECK_STATE);
            var notify_first_last= !!(flags & AddChildFlags.NOTIFY_FIRST_LAST);

            var old_first_child = this[PRIVATE].first_child;
            var old_last_child  = this[PRIVATE].last_child;

            if (create_meta) {
                // XXX assert isa Container
                this.create_child_meta(child);
            }

            child[PRIVATE].parent = null;
            child[PRIVATE].next_sibling = null;
            child[PRIVATE].prev_sibling = null;

            /* delegate the actual insertion */
            var args = Array.prototype.slice.call(arguments, 2);
            args[0] = child;
            add_func.apply(this, args);

            console.assert(child[PRIVATE].parent === this);

            this[PRIVATE].n_children += 1;

            /* if push_internal() has been called then we automatically set
             * the flag on the actor
             */
            if (this[PRIVATE].internal_child) {
                child[PRIVATE].flags |= ActorPrivateFlags.INTERNAL_CHILD;
            }

            /* clutter_actor_reparent() will emit ::parent-set for us */
            if (emit_parent_set && !child[PRIVATE].in_reparent) {
                child.emit('parent-set', null/* old parent */);
            }

            if (check_state) {
                /* If parent is mapped or realized, we need to also be mapped or
                 * realized once we're inside the parent.
                 */
                child.update_map_state(MapState.CHECK);

                /* propagate the parent's text direction to the child */
                child.text_direction = this.text_direction;
            }

            if (child[PRIVATE].show_on_set_parent) {
                child.show();
            }

            if (child.mapped) {
                child.queue_redraw();
            }

            /* maintain the invariant that if an actor needs layout,
             * its parents do as well
             */
            if (child[PRIVATE].needs_width_request ||
                child[PRIVATE].needs_height_request ||
                child[PRIVATE].needs_allocation) {
                /* we work around the short-circuiting we do
                 * in clutter_actor_queue_relayout() since we
                 * want to force a relayout
                 */
                child[PRIVATE].needs_width_request = true;
                child[PRIVATE].needs_height_request = true;
                child[PRIVATE].needs_allocation = true;

                child[PRIVATE].parent.queue_relayout();
            }

            if (emit_actor_added) {
                this.emit("actor-added", child);
            }

            if (notify_first_last) {
                if (old_first_child !== this[PRIVATE].first_child) {
                    this.notify('first_child');
                }

                if (old_last_child !== this[PRIVATE].last_child) {
                    this.notify('last_child');
                }
            }
        },

/**
 * clutter_actor_add_child:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 *
 * Adds @child to the children of @self.
 *
 * This function will acquire a reference on @child that will only
 * be released when calling clutter_actor_remove_child().
 *
 * This function will take into consideration the #ClutterActor:depth
 * of @child, and will keep the list of children sorted.
 *
 * This function will emit the #ClutterContainer::actor-added signal
 * on @self.
 *
 * Since: 1.10
 */
        add_child: function(child) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(this !== child);
            console.assert(!child[PRIVATE].parent);

            this._add_child_internal(child, AddChildFlags.DEFAULT_FLAGS,
                                     this._insert_child_at_depth);
        },

/**
 * clutter_actor_insert_child_at_index:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 * @index_: the index
 *
 * Inserts @child into the list of children of @self, using the
 * given @index_.
 *
 * This function will acquire a reference on @child that will only
 * be released when calling clutter_actor_remove_child().
 *
 * This function will not take into consideration the #ClutterActor:depth
 * of @child.
 *
 * This function will emit the #ClutterContainer::actor-added signal
 * on @self.
 *
 * Since: 1.10
 */
        insert_child_at_index: function(child, index_) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(this !== child);
            console.assert(!child[PRIVATE].parent);

            this._add_child_internal(child, AddChildFlags.DEFAULT_FLAGS,
                                     this._insert_child_at_index, index_);
        },

/**
 * clutter_actor_insert_child_above:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 * @sibling: (allow-none): a child of @self, or %NULL
 *
 * Inserts @child into the list of children of @self, above another
 * child of @self or, if @sibling is %NULL, above all the children
 * of @self.
 *
 * This function will acquire a reference on @child that will only
 * be released when calling clutter_actor_remove_child().
 *
 * This function will not take into consideration the #ClutterActor:depth
 * of @child.
 *
 * This function will emit the #ClutterContainer::actor-added signal
 * on @self.
 *
 * Since: 1.10
 */
        insert_child_above: function(child, sibling) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(this !== child);
            console.assert(child !== sibling);
            console.assert(!child[PRIVATE].parent);
            console.assert((!sibling) ||
                           (sibling instanceof Actor &&
                            sibling[PRIVATE].parent === this));

            this._add_child_internal(child, AddChildFlags.DEFAULT_FLAGS,
                                     this._insert_child_above, sibling);
        },

/**
 * clutter_actor_insert_child_below:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 * @sibling: (allow-none): a child of @self, or %NULL
 *
 * Inserts @child into the list of children of @self, below another
 * child of @self or, if @sibling is %NULL, below all the children
 * of @self.
 *
 * This function will acquire a reference on @child that will only
 * be released when calling clutter_actor_remove_child().
 *
 * This function will not take into consideration the #ClutterActor:depth
 * of @child.
 *
 * This function will emit the #ClutterContainer::actor-added signal
 * on @self.
 *
 * Since: 1.10
 */
// line 9912
        insert_child_below: function(child, sibling) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(this !== child);
            console.assert(child !== sibling);
            console.assert(!child[PRIVATE].parent);
            console.assert((!sibling) ||
                           (sibling instanceof Actor &&
                            sibling[PRIVATE].parent === this));

            this._add_child_internal(child, AddChildFlags.DEFAULT_FLAGS,
                                     this._insert_child_below, sibling);
        },

/**
 * clutter_actor_get_parent:
 * @self: A #ClutterActor
 *
 * Retrieves the parent of @self.
 *
 * Return Value: (transfer none): The #ClutterActor parent, or %NULL
 *  if no parent is set
 */
// line 10300
        get parent() {
            return this[PRIVATE].parent;
        },
/**
 * clutter_actor_get_paint_visibility:
 * @self: A #ClutterActor
 *
 * Retrieves the 'paint' visibility of an actor recursively checking for non
 * visible parents.
 *
 * This is by definition the same as %CLUTTER_ACTOR_IS_MAPPED.
 *
 * Return Value: %TRUE if the actor is visibile and will be painted.
 *
 * Since: 0.8.4
 */
// line 10321
        get paint_visibility() {
            return this.mapped;
        },

/**
 * clutter_actor_remove_child:
 * @self: a #ClutterActor
 * @child: a #ClutterActor
 *
 * Removes @child from the children of @self.
 *
 * This function will release the reference added by
 * clutter_actor_add_child(), so if you want to keep using @child
 * you will have to acquire a referenced on it before calling this
 * function.
 *
 * This function will emit the #ClutterContainer::actor-removed
 * signal on @self.
 *
 * Since: 1.10
 */
// line 10346
        remove_child: function(child) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(this !== child);
            console.assert(child[PRIVATE].parent);
            console.assert(child[PRIVATE].parent === this);

            this._remove_child_internal(child, RemoveChildFlags.DEFAULT_FLAGS);
        },

/**
 * clutter_actor_remove_all_children:
 * @self: a #ClutterActor
 *
 * Removes all children of @self.
 *
 * This function releases the reference added by inserting a child actor
 * in the list of children of @self.
 *
 * Since: 1.10
 */
// line 10371
        remove_all_children: function() {
            if (this[PRIVATE].n_children === 0) { return; }

            var iter = this[PRIVATE].first_child;
            while (iter) {
                var next = iter[PRIVATE].next_sibling;

                this._remove_child_internal(iter,
                                            RemoveChildFlags.DEFAULT_FLAGS);

                iter = next;
            }

            console.assert(!this[PRIVATE].first_child);
            console.assert(!this[PRIVATE].last_child);
            console.assert(this[PRIVATE].n_children === 0);
        },


        // line 10402
        _insert_child_between: function(child, prev_sibling, next_sibling) {
            child[PRIVATE].parent = this;
            child[PRIVATE].prev_sibling = prev_sibling;
            child[PRIVATE].next_sibling = next_sibling;

            if (prev_sibling) {
                prev_sibling[PRIVATE].next_sibling = child;
            }
            if (next_sibling) {
                next_sibling[PRIVATE].prev_sibling = child;
            }
            if (!child[PRIVATE].prev_sibling) {
                this[PRIVATE].first_child = child;
            }
            if (!child[PRIVATE].next_sibling) {
                this[PRIVATE].last_child = child;
            }
        },
/**
 * clutter_actor_replace_child:
 * @self: a #ClutterActor
 * @old_child: the child of @self to replace
 * @new_child: the #ClutterActor to replace @old_child
 *
 * Replaces @old_child with @new_child in the list of children of @self.
 *
 * Since: 1.10
 */
// line 10438
        replace_child: function(old_child, new_child) {
            console.assert(this instanceof Actor);
            console.assert(old_child instanceof Actor);
            console.assert(old_child.parent === this);
            console.assert(new_child instanceof Actor);
            console.assert(old_child !== new_child);
            console.assert(new_child !== this);
            console.assert(!new_child.parent);

            var prev_sibling = old_child[PRIVATE].prev_sibling;
            var next_sibling = old_child[PRIVATE].next_sibling;
            this._remove_child_internal(old_child,
                                        RemoveChildFlags.DEFAULT_FLAGS);
            this._add_child_internal(new_child,
                                     AddChildFlags.DEFAULT_FLAGS,
                                     this._insert_child_between,
                                     prev_sibling, next_sibling);
        },

/**
 * clutter_actor_contains:
 * @self: A #ClutterActor
 * @descendant: A #ClutterActor, possibly contained in @self
 *
 * Determines if @descendant is contained inside @self (either as an
 * immediate child, or as a deeper descendant). If @self and
 * @descendant point to the same actor then it will also return %TRUE.
 *
 * Return value: whether @descendent is contained within @self
 *
 * Since: 1.4
 */
// line 10608
        contains: function(descendant) {
            var actor;
            for (actor = descendant; actor; actor = actor[PRIVATE].parent) {
                if (actor === this) {
                    return true;
                }
            }
            return false;
        },

/**
 * clutter_actor_set_child_above_sibling:
 * @self: a #ClutterActor
 * @child: a #ClutterActor child of @self
 * @sibling: (allow-none): a #ClutterActor child of @self, or %NULL
 *
 * Sets @child to be above @sibling in the list of children of @self.
 *
 * If @sibling is %NULL, @child will be the new last child of @self.
 *
 * This function is logically equivalent to removing @child and using
 * clutter_actor_insert_child_above(), but it will not emit signals
 * or change state on @child.
 *
 * Since: 1.10
 */
        set_child_above_sibling: function(child, sibling) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(child[PRIVATE].parent === this);
            console.assert(child !== sibling);
            console.assert((!sibling) || (sibling instanceof Actor));

            if (sibling) {
                console.assert(sibling[PRIVATE].parent === this);
            }

            /* we don't want to change the state of child, or emit signals, or
             * regenerate ChildMeta instances here, but we still want to follow
             * the correct sequence of steps encoded in remove_child() and
             * add_child(), so that correctness is ensured, and we only go
             * through one known code path.
             */
            this._remove_child_internal(child, 0);
            this._add_child_internal(child, AddChildFlags.NOTIFY_FIRST_LAST,
                                     this._insert_child_above, sibling);

            this.queue_relayout();
        },

/**
 * clutter_actor_set_child_below_sibling:
 * @self: a #ClutterActor
 * @child: a #ClutterActor child of @self
 * @sibling: (allow-none): a #ClutterActor child of @self, or %NULL
 *
 * Sets @child to be below @sibling in the list of children of @self.
 *
 * If @sibling is %NULL, @child will be the new first child of @self.
 *
 * This function is logically equivalent to removing @self and using
 * clutter_actor_insert_child_below(), but it will not emit signals
 * or change state on @child.
 *
 * Since: 1.10
 */
        set_child_below_sibling: function(child, sibling) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(child[PRIVATE].parent === this);
            console.assert(child !== sibling);
            console.assert((!sibling) || (sibling instanceof Actor));

            if (sibling) {
                console.assert(sibling[PRIVATE].parent === this);
            }

            /* see the comment in set_child_above_sibling() */
            this._remove_child_internal(child, 0);
            this._add_child_internal(child, AddChildFlags.NOTIFY_FIRST_LAST,
                                     this._insert_child_below, sibling);

            this.queue_relayout();
        },

/**
 * clutter_actor_set_child_at_index:
 * @self: a #ClutterActor
 * @child: a #ClutterActor child of @self
 * @index_: the new index for @child
 *
 * Changes the index of @child in the list of children of @self.
 *
 * This function is logically equivalent to removing @child and
 * calling clutter_actor_insert_child_at_index(), but it will not
 * emit signals or change state on @child.
 *
 * Since: 1.10
 */
        set_child_at_index: function(child, index_) {
            console.assert(this instanceof Actor);
            console.assert(child instanceof Actor);
            console.assert(child[PRIVATE].parent === this);
            console.assert(index_ <= this[PRIVATE].n_children);

            this._remove_child_internal(child, 0);
            this._add_child_internal(child, AddChildFlags.NOTIFY_FIRST_LAST,
                                     this._insert_child_at_index, index_);

            this.queue_relayout();
        },

/*
 * Event handling
 */

/**
 * clutter_actor_event:
 * @actor: a #ClutterActor
 * @event: a #ClutterEvent
 * @capture: TRUE if event in in capture phase, FALSE otherwise.
 *
 * This function is used to emit an event on the main stage.
 * You should rarely need to use this function, except for
 * synthetising events.
 *
 * Return value: the return value from the signal emission: %TRUE
 *   if the actor handled the event, or %FALSE if the event was
 *   not handled
 *
 * Since: 0.6
 */
        event: function(event, capture) {
            var retval;

            console.assert(event);

            if (capture) {
                return this.emit('captured-event', event);
            }

            retval = this.emit('event', event);
            if (retval) { return retval; }

            var signal = null;
            if (event.type === Event.Type.NOTHING) {
                signal = null;
            } else if (event.type === Event.Type.BUTTON_PRESS) {
                signal = "button-press-event";
            } else if (event.type === Event.Type.BUTTON_RELEASE) {
                signal = "button-release-event";
            } else if (event.type === Event.Type.SCROLL) {
                signal = "scroll-event";
            } else if (event.type === Event.Type.KEY_PRESS) {
                signal = "key-press-event";
            } else if (event.type === Event.Type.KEY_RELEASE) {
                signal = "key-release-event";
            } else if (event.type === Event.Type.MOTION) {
                signal = "motion-event";
            } else if (event.type === Event.Type.ENTER) {
                signal = "enter-event";
            } else if (event.type === Event.Type.LEAVE) {
                signal = "leave-event";
            } else if (event.type === Event.Type.DELETE ||
                       event.type === Event.Type.DESTROY_NOTIFY ||
                       event.type === Event.Type.CLIENT_MESSAGE) {
                signal = null;
            } else {
                signal = null;
            }

            if (signal) {
                return this.emit(signal, event);
            }
            return retval;
        },

/**
 * clutter_actor_set_reactive:
 * @actor: a #ClutterActor
 * @reactive: whether the actor should be reactive to events
 *
 * Sets @actor as reactive. Reactive actors will receive events.
 *
 * Since: 0.6
 */
        set reactive(reactive) {
            if (reactive === this.reactive) { return; }

            if (reactive) {
                this.flags |= ActorFlags.REACTIVE;
            } else {
                this.flags &= (~ActorFlags.REACTIVE);
            }
            this.notify('reactive');
        },

/**
 * clutter_actor_get_reactive:
 * @actor: a #ClutterActor
 *
 * Checks whether @actor is marked as reactive.
 *
 * Return value: %TRUE if the actor is reactive
 *
 * Since: 0.6
 */
        get reactive() { return !!(this.flags & ActorFlags.REACTIVE); },

        // XXX CSA missing functions here
/**
 * clutter_actor_is_rotated:
 * @self: a #ClutterActor
 *
 * Checks whether any rotation is applied to the actor.
 *
 * Return value: %TRUE if the actor is rotated.
 *
 * Since: 0.6
 */
// line 12593
        get is_rotated() {
            var info = this._get_transform_info_or_defaults();
            if (info.rx_angle !== 0 ||
                info.ry_angle !== 0 ||
                info.rz_angle !== 0) {
                return true;
            }
            return false;
        },
/**
 * clutter_actor_is_scaled:
 * @self: a #ClutterActor
 *
 * Checks whether the actor is scaled in either dimension.
 *
 * Return value: %TRUE if the actor is scaled.
 *
 * Since: 0.6
 */
// line 12618
        get is_scaled() {
            var info = this._get_transform_info_or_defaults();

            if (info.scale_x !== 1 || info.scale_y !== 1) {
                return true;
            }
            return false;
        },

        // line 12633
        _get_stage_internal: function() {
            var actor = this;
            while (actor && !actor[PRIVATE].toplevel) {
                actor = actor[PRIVATE].parent;
            }
            return actor;
        },
/**
 * clutter_actor_get_stage:
 * @actor: a #ClutterActor
 *
 * Retrieves the #ClutterStage where @actor is contained.
 *
 * Return value: (transfer none) (type Clutter.Stage): the stage
 *   containing the actor, or %NULL
 *
 * Since: 0.8
 */
// line 12653
        get stage() {
            return this._get_stage_internal();
        },

        // XXX CSA XXX missing methods here

/**
 * clutter_actor_grab_key_focus:
 * @self: a #ClutterActor
 *
 * Sets the key focus of the #ClutterStage including @self
 * to this #ClutterActor.
 *
 * Since: 1.0
 */
// line 12968
        grab_key_focus: function() {
            var stage = this._get_stage_internal();
            if (stage) {
                stage.set_key_focus(this);
            }
        },

/* Allows overriding the calculated paint opacity. Used by ClutterClone and
 * ClutterOffscreenEffect.
 */
// line 13085
        set opacity_override(opacity) {
            // CSA XXX: shouldn't this call notify()? and queue_redraw()?
            this[PRIVATE].opacity_override = opacity;
        },
// line 13094
        get opacity_override() {
            return this[PRIVATE].opacity_override;
        },
/* Allows you to disable applying the actors model view transform during
 * a paint. Used by ClutterClone. */
        set _enable_model_view_transform(enable) {
            this[PRIVATE].enable_model_view_transform = !!enable;
        },
        // line 13113
        set _enable_paint_unmapped(enable) {
            var priv = this[PRIVATE];

            priv.enable_paint_unmapped = !!enable;

            if (priv.enable_paint_unmapped) {
                /* Make sure that the parents of the widget are realized first;
                 * otherwise checks in clutter_actor_update_map_state() will
                 * fail.
                 */
                this.realize();

                this.update_map_state(MapState.MAKE_MAPPED);
            } else {
                this.update_map_state(MapState.MAKE_UNMAPPED);
            }
        },

        // XXX CSA missing functions

/**
 * clutter_actor_set_clip_to_allocation:
 * @self: a #ClutterActor
 * @clip_set: %TRUE to apply a clip tracking the allocation
 *
 * Sets whether @self should be clipped to the same size as its
 * allocation
 *
 * Since: 1.4
 */
// line 14186
        set clip_to_allocation(clip_set) {
            var priv = this[PRIVATE];
            clip_set = !!clip_set;

            if (this.clip_to_allocation !== clip_set) {
                priv.clip_to_allocation = clip_set;
                this.queue_redraw();
                this.notify('clip_to_allocation');
            }
        },
/**
 * clutter_actor_get_clip_to_allocation:
 * @self: a #ClutterActor
 *
 * Retrieves the value set using clutter_actor_set_clip_to_allocation()
 *
 * Return value: %TRUE if the #ClutterActor is clipped to its allocation
 *
 * Since: 1.4
 */
// line 14218
        get clip_to_allocation() {
            return !!this[PRIVATE].clip_to_allocation;
        },

        // XXX CSA more functions

/**
 * clutter_actor_has_key_focus:
 * @self: a #ClutterActor
 *
 * Checks whether @self is the #ClutterActor that has key focus
 *
 * Return value: %TRUE if the actor has key focus, and %FALSE otherwise
 *
 * Since: 1.4
 */
// line 14427
        get has_key_focus() {
            var stage = this._get_stage_internal();
            if (!stage) { return false; }
            return (stage.get_key_focus() === this);
        },

        // XXX CSA more functions

/**
 * clutter_actor_has_overlaps:
 * @self: A #ClutterActor
 *
 * Asks the actor's implementation whether it may contain overlapping
 * primitives.
 *
 * For example; Clutter may use this to determine whether the painting
 * should be redirected to an offscreen buffer to correctly implement
 * the opacity property.
 *
 * Custom actors can override the default response by implementing the
 * #ClutterActor <function>has_overlaps</function> virtual function. See
 * clutter_actor_set_offscreen_redirect() for more information.
 *
 * Return value: %TRUE if the actor may have overlapping primitives, and
 *   %FALSE otherwise
 *
 * Since: 1.8
 */
// line 14741
        get has_overlaps() {
            // CSA: virtual method invocation
            return this.real_has_overlaps;
        },


/**
 * clutter_actor_has_effects:
 * @self: A #ClutterActor
 *
 * Returns whether the actor has any effects applied.
 *
 * Return value: %TRUE if the actor has any effects,
 *   %FALSE otherwise
 *
 * Since: 1.10
 */
 // line 14760
        get has_effects() {
            console.warn("has_effects unimplemented");
            return false;
        },

/**
 * clutter_actor_has_constraints:
 * @self: A #ClutterActor
 *
 * Returns whether the actor has any constraints applied.
 *
 * Return value: %TRUE if the actor has any constraints,
 *   %FALSE otherwise
 *
 * Since: 1.10
 */
// line 14782
        get has_constraints() {
            return !!(this[PRIVATE].constraints);
        },

/**
 * clutter_actor_has_actions:
 * @self: A #ClutterActor
 *
 * Returns whether the actor has any actions applied.
 *
 * Return value: %TRUE if the actor has any actions,
 *   %FALSE otherwise
 *
 * Since: 1.10
 */
// line 14801
        get has_actions() {
            return !!(this[PRIVATE].actions);
        },

/**
 * clutter_actor_get_n_children:
 * @self: a #ClutterActor
 *
 * Retrieves the number of children of @self.
 *
 * Return value: the number of children of an actor
 *
 * Since: 1.10
 */
// line 14819
        get n_children() {
            return this[PRIVATE].n_children;
        },

/**
 * clutter_actor_get_child_at_index:
 * @self: a #ClutterActor
 * @index_: the position in the list of children
 *
 * Retrieves the actor at the given @index_ inside the list of
 * children of @self.
 *
 * Return value: (transfer none): a pointer to a #ClutterActor, or %NULL
 *
 * Since: 1.10
 */
// line 14839
        get_child_at_index: function(index_) {
            var iter, i;

            console.assert(index_ < this.n_children); // CSA wrong in upstream

            for (iter = this.first_child, i = 0;
                 iter && i < index_;
                 iter = iter.next_sibling, i += 1) {
                /* do nothing */
            }
            return iter;
        },

/*< private >
 * _clutter_actor_foreach_child:
 * @actor: The actor whos children you want to iterate
 * @callback: The function to call for each child
 * @user_data: Private data to pass to @callback
 *
 * Calls a given @callback once for each child of the specified @actor and
 * passing the @user_data pointer each time.
 *
 * Return value: returns %TRUE if all children were iterated, else
 *    %FALSE if a callback broke out of iteration early.
 */
// line 14869
        _foreach_child: function(callback) {
            var iter, cont = true;
            for (iter = this.first_child;
                 (cont !== false) && iter;
                 iter = iter.next_sibling) {
                // "undefined" will keep the iteration going
                cont = callback.call(iter);
            }
            return (cont !== false);
        },

        // XXX CSA more functions

        // line 14911
        _traverse_breadth: function(callback) {
            var current_depth = 0;
            var dummy = {}; /* use to delimit depth changes */
            var queue = [ this, dummy ];
            var flags, actor, iter;

            for (var i=0; i < queue.length; i++) {
                actor = queue[i];
                if (actor === dummy) {
                    current_depth+=1;
                    queue.push(dummy);
                    continue;
                }

                flags = callback.call(actor, current_depth);
                if (flags & TraverseVisitFlags.BREAK) {
                    break;
                } else if (!(flags & TraverseVisitFlags.SKIP_CHILDREN)) {
                    /*jshint loopfunc:true */
                    actor._foreach_child(function() {
                        queue.push(this);
                        return true;
                    });
                }
            }
        },

        // line 14953
        _traverse_depth: function(before_children_cb, after_children_cb,
                                  current_depth) {
            var flags = 0;

            if (before_children_cb) {
                flags = before_children_cb.call(this, current_depth);
            }

            if (flags & TraverseVisitFlags.BREAK) {
                return TraverseVisitFlags.BREAK;
            }

            if (!(flags & TraverseVisitFlags.SKIP_CHILDREN)) {
                var iter;

                for (iter = this.first_child;
                     iter;
                     iter = iter.next_sibling) {
                    flags = iter._traverse_depth(before_children_cb,
                                                 after_children_cb,
                                                 current_depth + 1);

                    if (flags & TraverseVisitFlags.BREAK) {
                        return TraverseVisitFlags.BREAK;
                    }
                }
            }

            if (after_children_cb) {
                return after_children_cb.call(this, current_depth);
            }
            return TraverseVisitFlags.CONTINUE;
        },

/* _clutter_actor_traverse:
 * @actor: The actor to start traversing the graph from
 * @flags: These flags may affect how the traversal is done
 * @before_children_callback: A function to call before visiting the
 *   children of the current actor.
 * @after_children_callback: A function to call after visiting the
 *   children of the current actor. (Ignored if
 *   %CLUTTER_ACTOR_TRAVERSE_BREADTH_FIRST is passed to @flags.)
 * @user_data: The private data to pass to the callbacks
 *
 * Traverses the scenegraph starting at the specified @actor and
 * descending through all its children and its children's children.
 * For each actor traversed @before_children_callback and
 * @after_children_callback are called with the specified
 * @user_data, before and after visiting that actor's children.
 *
 * The callbacks can return flags that affect the ongoing traversal
 * such as by skipping over an actors children or bailing out of
 * any further traversing.
 */
// line 15011
        _traverse: function(flags, before, after) {
            if (flags & TraverseFlags.BREADTH_FIRST) {
                this._traverse_breadth(before);
            } else {
                this._traverse_depth(before, after, 0 /* start depth */);
            }
        },

/**
 * clutter_actor_set_layout_manager:
 * @self: a #ClutterActor
 * @manager: (allow-none): a #ClutterLayoutManager, or %NULL to unset it
 *
 * Sets the #ClutterLayoutManager delegate object that will be used to
 * lay out the children of @self.
 *
 * The #ClutterActor will take a reference on the passed @manager which
 * will be released either when the layout manager is removed, or when
 * the actor is destroyed.
 *
 * Since: 1.10
 */
        // line 15051
        set layout_manager(manager) {
            var actor = this;
            var priv = this[PRIVATE];

            var on_layout_manager_changed = function() {
                actor.queue_relayout();
            };

            if (priv.layout_manager) {
                priv.layout_manager.disconnect(priv.layout_manager_id);
                priv.layout_manager.container = null;
            }
            priv.layout_manager = manager;
            if (priv.layout_manager) {
                priv.layout_manager.container = this;
                priv.layout_manager_id =
                    priv.layout_manager.connect('layout-changed',
                                                on_layout_manager_changed);
            }
            this.queue_relayout();
            this.notify('layout_manager');
        },

/**
 * clutter_actor_get_layout_manager:
 * @self: a #ClutterActor
 *
 * Retrieves the #ClutterLayoutManager used by @self.
 *
 * Return value: (transfer none): a pointer to the #ClutterLayoutManager,
 *   or %NULL
 *
 * Since: 1.10
 */
        // line 15099
        get layout_manager() {
            return this[PRIVATE].layout_manager;
        },

/*< private >
 * _clutter_actor_get_layout_info:
 * @self: a #ClutterActor
 *
 * Retrieves a pointer to the ClutterLayoutInfo structure.
 *
 * If the actor does not have a ClutterLayoutInfo associated to it, one
 * will be created and initialized to the default values.
 *
 * This function should be used for setters.
 *
 * For getters, you should use _clutter_actor_get_layout_info_or_defaults()
 * instead.
 *
 * Return value: (transfer none): a pointer to the ClutterLayoutInfo structure
 */
        // line 15140
        _get_layout_info: function() {
            if (!('_layout_info' in this)) {
                this._layout_info = new LayoutInfo();
            }
            return this._layout_info;
        },

/*< private >
 * _clutter_actor_get_layout_info_or_defaults:
 * @self: a #ClutterActor
 *
 * Retrieves the ClutterLayoutInfo structure associated to an actor.
 *
 * If the actor does not have a ClutterLayoutInfo structure associated to it,
 * then the default structure will be returned.
 *
 * This function should only be used for getters.
 *
 * Return value: a const pointer to the ClutterLayoutInfo structure
 */
        // line 15173
        _get_layout_info_or_defaults: function() {
            if (!('_layout_info' in this)) {
                return new LayoutInfo();
            }
            return this._layout_info;
        },

/**
 * clutter_actor_set_x_align:
 * @self: a #ClutterActor
 * @x_align: the horizontal alignment policy
 *
 * Sets the horizontal alignment policy of a #ClutterActor, in case the
 * actor received extra horizontal space.
 *
 * See also the #ClutterActor:x-align property.
 *
 * Since: 1.10
 */
// line 15197
        set x_align(x_align) {
            var info = this._get_layout_info();
            if (info.x_align !== x_align) {
                info.x_align = x_align;

                this.queue_relayout();

                this.notify('x_align');
            }
        },

/**
 * clutter_actor_get_x_align:
 * @self: a #ClutterActor
 *
 * Retrieves the horizontal alignment policy set using
 * clutter_actor_set_x_align().
 *
 * Return value: the horizontal alignment policy.
 *
 * Since: 1.10
 */
// line 15228
        get x_align() {
            return this._get_layout_info_or_defaults().x_align;
        },

/**
 * clutter_actor_set_y_align:
 * @self: a #ClutterActor
 * @y_align: the vertical alignment policy
 *
 * Sets the vertical alignment policy of a #ClutterActor, in case the
 * actor received extra vertical space.
 *
 * See also the #ClutterActor:y-align property.
 *
 * Since: 1.10
 */
        set y_align(y_align) {
            var info = this._get_layout_info();
            if (info.y_align !== y_align) {
                info.y_align = y_align;

                this.queue_relayout();

                this.notify('y_align');
            }
        },

/**
 * clutter_actor_get_y_align:
 * @self: a #ClutterActor
 *
 * Retrieves the vertical alignment policy set using
 * clutter_actor_set_y_align().
 *
 * Return value: the vertical alignment policy.
 *
 * Since: 1.10
 */
        get y_align() {
            return this._get_layout_info_or_defaults().y_align;
        },

/**
 * clutter_actor_set_margin:
 * @self: a #ClutterActor
 * @margin: a #ClutterMargin
 *
 * Sets all the components of the margin of a #ClutterActor.
 *
 * Since: 1.10
 */
        set margin(margin) {
            console.assert(margin);
            var changed = false;

            this.freeze_notify();

            var info = this._get_layout_info();

            if (info.margin.top !== margin.top) {
                info.margin.top = margin.top;
                this.notify('margin_top');
                changed = true;
            }
            if (info.margin.right !== margin.right) {
                info.margin.right = margin.right;
                this.notify('margin_right');
                changed = true;
            }
            if (info.margin.bottom !== margin.bottom) {
                info.margin.bottom = margin.bottom;
                this.notify('margin_bottom');
                changed = true;
            }
            if (info.margin.left !== margin.left) {
                info.margin.left = margin.left;
                this.notify('margin_left');
                changed = true;
            }

            if (changed) {
                this.queue_relayout();
            }

            this.thaw_notify();
        },

/**
 * clutter_actor_get_margin:
 * @self: a #ClutterActor
 * @margin: (out caller-allocates): return location for a #ClutterMargin
 *
 * Retrieves all the components of the margin of a #ClutterActor.
 *
 * Since: 1.10
 */
        get margin() {
            var info = this._get_layout_info_or_defaults();

            return info.margin.copy();
        },

/**
 * clutter_actor_set_margin_top:
 * @self: a #ClutterActor
 * @margin: the top margin
 *
 * Sets the margin from the top of a #ClutterActor.
 *
 * Since: 1.10
 */
        set margin_top(margin) {
            console.assert(margin >= 0);

            var info = this._get_layout_info();
            if (info.margin.top === margin) {
                return;
            }
            info.margin.top = margin;
            this.queue_relayout();
            this.notify('margin_top');
        },

/**
 * clutter_actor_get_margin_top:
 * @self: a #ClutterActor
 *
 * Retrieves the top margin of a #ClutterActor.
 *
 * Return value: the top margin
 *
 * Since: 1.10
 */
        get margin_top() {
            return this._get_layout_info_or_defaults().margin.top;
        },

/**
 * clutter_actor_set_margin_bottom:
 * @self: a #ClutterActor
 * @margin: the bottom margin
 *
 * Sets the margin from the bottom of a #ClutterActor.
 *
 * Since: 1.10
 */
        set margin_bottom(margin) {
            console.assert(margin >= 0);

            var info = this._get_layout_info();
            if (info.margin.bottom === margin) {
                return;
            }
            info.margin.bottom = margin;
            this.queue_relayout();
            this.notify('margin_bottom');
        },

/**
 * clutter_actor_get_margin_bottom:
 * @self: a #ClutterActor
 *
 * Retrieves the bottom margin of a #ClutterActor.
 *
 * Return value: the bottom margin
 *
 * Since: 1.10
 */
        get margin_bottom() {
            return this._get_layout_info_or_defaults().margin.bottom;
        },

/**
 * clutter_actor_set_margin_left:
 * @self: a #ClutterActor
 * @margin: the left margin
 *
 * Sets the margin from the left of a #ClutterActor.
 *
 * Since: 1.10
 */
        set margin_left(margin) {
            console.assert(margin >= 0);

            var info = this._get_layout_info();
            if (info.margin.left === margin) {
                return;
            }
            info.margin.left = margin;
            this.queue_relayout();
            this.notify('margin_left');
        },

/**
 * clutter_actor_get_margin_left:
 * @self: a #ClutterActor
 *
 * Retrieves the left margin of a #ClutterActor.
 *
 * Return value: the left margin
 *
 * Since: 1.10
 */
        get margin_left() {
            return this._get_layout_info_or_defaults().margin.left;
        },

/**
 * clutter_actor_set_margin_right:
 * @self: a #ClutterActor
 * @margin: the right margin
 *
 * Sets the margin from the right of a #ClutterActor.
 *
 * Since: 1.10
 */
        set margin_right(margin) {
            console.assert(margin >= 0);

            var info = this._get_layout_info();
            if (info.margin.right === margin) {
                return;
            }
            info.margin.right = margin;
            this.queue_relayout();
            this.notify('margin_right');
        },

/**
 * clutter_actor_get_margin_right:
 * @self: a #ClutterActor
 *
 * Retrieves the right margin of a #ClutterActor.
 *
 * Return value: the right margin
 *
 * Since: 1.10
 */
        get margin_right() {
            return this._get_layout_info_or_defaults().margin.right;
        },

/**
 * clutter_actor_set_background_color:
 * @self: a #ClutterActor
 * @color: (allow-none): a #ClutterColor, or %NULL to unset a previously
 *  set color
 *
 * Sets the background color of a #ClutterActor.
 *
 * The background color will be used to cover the whole allocation of the
 * actor. The default background color of an actor is transparent.
 *
 * To check whether an actor has a background color, you can use the
 * #ClutterActor:background-color-set actor property.
 *
 * Since: 1.10
 */
        set background_color(color) {
            var priv = this[PRIVATE];
            if (!color) {
                priv.bg_color_set = false;
                this.notify('background_color_set');
                return;
            }
            if (priv.bg_color_set && Color.equal(color, priv.bg_color)) {
                return;
            }

            priv.bg_color = color.copy();
            priv.bg_color_set = true;

            this.queue_redraw();

            this.notify('background_color_set');
            this.notify('background_color');
        },
/**
 * clutter_actor_get_background_color:
 * @self: a #ClutterActor
 * @color: (out caller-allocates): return location for a #ClutterColor
 *
 * Retrieves the color set using clutter_actor_set_background_color().
 *
 * Since: 1.10
 */
        get background_color() {
            return this[PRIVATE].bg_color.copy();
        },
/**
 * clutter_actor_get_previous_sibling:
 * @self: a #ClutterActor
 *
 * Retrieves the sibling of @self that comes before it in the list
 * of children of @self's parent.
 *
 * The returned pointer is only valid until the scene graph changes; it
 * is not safe to modify the list of children of @self while iterating
 * it.
 *
 * Return value: (transfer none): a pointer to a #ClutterActor, or %NULL
 *
 * Since: 1.10
 */
        get previous_sibling() {
            return this[PRIVATE].prev_sibling;
        },
/**
 * clutter_actor_get_next_sibling:
 * @self: a #ClutterActor
 *
 * Retrieves the sibling of @self that comes after it in the list
 * of children of @self's parent.
 *
 * The returned pointer is only valid until the scene graph changes; it
 * is not safe to modify the list of children of @self while iterating
 * it.
 *
 * Return value: (transfer none): a pointer to a #ClutterActor, or %NULL
 *
 * Since: 1.10
 */
        get next_sibling() {
            return this[PRIVATE].next_sibling;
        },
/**
 * clutter_actor_get_first_child:
 * @self: a #ClutterActor
 *
 * Retrieves the first child of @self.
 *
 * The returned pointer is only valid until the scene graph changes; it
 * is not safe to modify the list of children of @self while iterating
 * it.
 *
 * Return value: (transfer none): a pointer to a #ClutterActor, or %NULL
 *
 * Since: 1.10
 */
        get first_child() {
            return this[PRIVATE].first_child;
        },
/**
 * clutter_actor_get_last_child:
 * @self: a #ClutterActor
 *
 * Retrieves the last child of @self.
 *
 * The returned pointer is only valid until the scene graph changes; it
 * is not safe to modify the list of children of @self while iterating
 * it.
 *
 * Return value: (transfer none): a pointer to a #ClutterActor, or %NULL
 *
 * Since: 1.10
 */
        get last_child() {
            return this[PRIVATE].last_child;
        },

        get no_layout() { return !!(this.flags & ActorFlags.NO_LAYOUT); },
        set no_layout(no_layout) {
            if (no_layout === this.no_layout) { return; }

            if (no_layout) {
                this.flags |= ActorFlags.NO_LAYOUT;
            } else {
                this.flags &= (~ActorFlags.NO_LAYOUT);
            }
            this.notify('no_layout');
        }
    };
    Signals.addSignalMethods(Actor.prototype);
    Signals.register(Actor.prototype, {
        destroy: {
            flags: Signals.RUN_CLEANUP | Signals.NO_RECURSE | Signals.NO_HOOKS,
        },
        show: {
            flags: Signals.RUN_FIRST,
            closure: Actor.prototype.real_show
        },
        hide: {
            flags: Signals.RUN_FIRST,
            closure: Actor.prototype.real_hide
        },
        'parent-set': {
            flags: Signals.RUN_LAST,
        },
        'queue-redraw': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_queue_redraw
        },
        'queue-relayout': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_queue_relayout
        },
        event: {
            flags: Signals.RUN_LAST,
        },
        'button-press-event': {
            flags: Signals.RUN_LAST,
        },
        'button-release-event': {
            flags: Signals.RUN_LAST,
        },
        'scroll-event': {
            flags: Signals.RUN_LAST,
        },
        'key-press-event': {
            flags: Signals.RUN_LAST,
        },
        'key-release-event': {
            flags: Signals.RUN_LAST,
        },
        'motion-event': {
            flags: Signals.RUN_LAST,
        },
        'key-focus-in': {
            flags: Signals.RUN_LAST,
        },
        'key-focus-out': {
            flags: Signals.RUN_LAST,
        },
        'enter-event': {
            flags: Signals.RUN_LAST,
        },
        'leave-event': {
            flags: Signals.RUN_LAST,
        },
        'captured-event': {
            flags: Signals.RUN_LAST,
        },
        'paint': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_paint
        },
        'map': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_map
        },
        'unmap': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_unmap
        },
        'realize': {
            flags: Signals.RUN_LAST,
        },
        'unrealize': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_unrealize
        },
        'pick': {
            flags: Signals.RUN_LAST,
            closure: Actor.prototype.real_pick
        },
        'allocation-changed': {
            flags: Signals.RUN_LAST
        },
        'allocate': {
            closure: Actor.prototype.real_allocate
        },
        'get-preferred-width': {
            closure: Actor.prototype.real_get_preferred_width
        },
        'get-preferred-height': {
            closure: Actor.prototype.real_get_preferred_height
        },
    });

    return Actor;
});

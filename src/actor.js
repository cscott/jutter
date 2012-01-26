define(["./note"], function(note) {

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
        NO_LAYOUT: 1 << 5,
    };
    Object.freeze(ActorFlags);

    var Actor = function() {
        this.flags = 0;
        var private_flags;

        var PrivateFlags = {
            IN_DESTRUCTION:  1 << 0,
            IS_TOPLEVEL   :  1 << 1,
            IN_REPARENT   :  1 << 2,
            IN_PAINT      :  1 << 3,
            IN_RELAYOUT   :  1 << 4,
            IN_RESIZE     :  1 << 5,
            INTERNAL_CHILD:  1 << 6
        };
        Object.freeze(PrivateFlags);

        this['private'] = {
            pick_id: -1,
            get in_destruction() {
                return private_flags & PrivateFlags.IN_DESTRUCTION;
            },
            get toplevel() {
                return private_flags & PrivateFlags.IS_TOPLEVEL;
            },
            get in_reparent() {
                return private_flags & PrivateFlags.INTERNAL_CHILD;
            },
            get in_paint() {
                return private_flags & PrivateFlags.IN_PAINT;
            },
            get in_relayout() {
                return private_flags & PrivateFlags.IN_RELAYOUT;
            },
            get in_resize() {
                return private_flags & PrivateFlags.IN_RESIZE;
            },
            get internal_child() {
                return private_flags & PrivateFlags.INTERNAL_CHILD;
            }
        };
    };
    Actor.prototype = {
        get mapped() { return this.flags & ActorFlags.MAPPED; },
        set mapped(mapped) {
            if (this.mapped == mapped) return;
            if (mapped) {
                this.map();
            } else {
                this.unmap();
            }
            console.assert(this.mapped == mapped);
        },
        update_map_state: function(change) {
            var was_mapped = this.mapped;
            if (this['private'].toplevel) {
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
                if (this.visible)
                    this.realize();

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
                    !this['private'].in_destruction) {
                    console.warn("Clutter toplevel is not visible, "+
                                 "but it is somehow still mapped", this);
                }
            } else {
                var parent = this['private'].parent;

                var should_be_mapped = false;
                var may_be_realized = true;
                var must_be_realized = false;

                if (parent === null || change === MapState.MAKE_UNREALIZED) {
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
                            parent['private'].toplevel &&
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
                    if (this['private'].enable_paint_unmapped) {
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
                if (!should_be_mapped && !this['private'].in_reparent) {
                    this.mapped = false;
                }

                /* Realize */
                if (must_be_realized) {
                    this.realize();
                }

                /* if we must be realized then we may be, presumably */
                console.assert(!(must_be_realized && !may_be_realized));

                /* Unrealize */
                if (!may_be_realized && !this['private'].in_reparent) {
                    this.unrealize_not_hiding();
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
            //this.verify_map_state(); // XXX DEBUG XXX
        },

        real_map: function() {
            console.assert(!this.mapped);

            note("Mapping actor", this);
            this.flags |= ActorFlags.MAPPED;

            var stage = this._get_stage_internal();
            this['private'].pick_id = stage.acquire_pick_id(this);
            note("Pick id", this['private'].pick_id,
                        "for actor", this);

            /* notify on parent mapped before potentially mapping
             * children, so apps see a top-down notification.
             */
            this.emit_prop('mapped');

            for (var iter = this['private'].first_child;
                 iter;
                 iter = iter['private'].next_sibling) {
                iter.map();
            }
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
        map: function() {
            if (this.mapped) return;
            if (!this.visible) return;

            this.update_map_state(MapState.MAKE_MAPPED);
        },

        real_unmap: function() {
            console.assert(this.mapped);
            note("Unmapping actor", this);

            for (var iter = this['private'].first_child;
                 iter;
                 iter = iter['private'].next_sibling) {
                iter.unmap();
            }

            this.flags &= (~ActorFlags.MAPPED);

            /* clear the contents of the last paint volume, so that hiding + moving +
             * showing will not result in the wrong area being repainted
             */
            this['private'].last_paint_volume.init();
            this['private'].last_paint_volume_valid = true;

            /* notify on parent mapped after potentially unmapping
             * children, so apps see a bottom-up notification.
             */
            this.emit_prop('mapped');

            /* relinquish keyboard focus if we were unmapped while owning it */
            if (!this['private'].toplevel) {
                stage = this._get_stage_internal();
                if (stage) {
                    stage._release_pick_id(this['private'].pick_id);
                }
                this['private'].pick_id = -1;
                if (stage && stage.key_focus == this) {
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
        unmap: function() {
            if (!this.mapped) return;

            this.update_map_state(MapState.MAKE_UNMAPPED);
        },

        get realized() { return this.flags & ActorFlags.REALIZED; },
        get visible() { return this.flags & ActorFlags.VISIBLE; },
        get reactive() { return this.flags & ActorFlags.REACTIVE; }
    };

    return Actor;
});

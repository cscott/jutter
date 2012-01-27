define(["./color", "./note", "./signals"], function(Color, Note, Signals) {
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
        NO_LAYOUT: 1 << 5,
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

    var PRIVATE = "_actor_private";
    var ActorPrivate = function() { this._init(); }
    ActorPrivate.prototype = {
        _init: function() {
            this.flags = 0;
            this.pick_id = -1;
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

    var Actor = function() {
        this._init();
    };
    Actor.prototype = {
        _init: function() {
            this.flags = 0;
            this[PRIVATE] = new ActorPrivate();
        },
        get mapped() { return !!(this.flags & ActorFlags.MAPPED); },
        set mapped(mapped) {
            if (this.mapped == mapped) return;
            if (mapped) {
                this.map();
            } else {
                this.unmap();
            }
            console.assert(this.mapped == mapped);
        },
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
                        var iter = self;

                        /* check for the enable_paint_unmapped flag on the actor
                         * and parents; if the flag is enabled at any point of this
                         * branch of the scene graph then all the later checks
                         * become pointless
                         */
                        while (iter) {
                            if (iter[PRIVATE].enable_paint_unmapped)
                                return;

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
                    !this[PRIVATE].in_destruction) {
                    console.warn("Clutter toplevel is not visible, "+
                                 "but it is somehow still mapped", this);
                }
            } else {
                var parent = this[PRIVATE].parent;

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
            this.verify_map_state(); // XXX DEBUG XXX
        },

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
        map: function() {
            if (this.mapped) return;
            if (!this.visible) return;

            this.update_map_state(MapState.MAKE_MAPPED);
        },

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
                stage = this._get_stage_internal();
                if (stage) {
                    stage._release_pick_id(this[PRIVATE].pick_id);
                }
                this[PRIVATE].pick_id = -1;
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


        get visible() { return !!(this.flags & ActorFlags.VISIBLE); },
        set visible(visible) {
            if (this.visible == visible) return;
            if (visible) {
                this.show();
            } else {
                this.hide();
            }
            console.assert(this.visible == visible);
        },
        real_show: function() {
            if (this.visible) return;

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

        get show_on_set_parent() {
            return this[PRIVATE].show_on_set_parent;
        },
        set show_on_set_parent(set_show) {
            var priv = this[PRIVATE];
            set_show = !!set_show;
            if (priv.show_on_set_parent === set_show)
                return;
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
            this.notify('visible'); // XXX CSA visible flag not toggled?!

            var priv = this[PRIVATE];
            if (priv.parent)
                priv.parent.queue_redraw();

            this.thaw_notify();
        },

        real_hide: function() {
            if (!this.visible) return;

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
            this.notify('visible'); // XXX CSA visible flag not toggled?!

            var priv = this[PRIVATE];
            if (priv.parent)
                priv.parent.queue_redraw();

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
            if (this.realized) return;

            /* To be realized, our parent actors must be realized first.
             * This will only succeed if we're inside a toplevel.
             */
            var priv = this[PRIVATE];
            if (priv.parent)
                priv.parent.realize();

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
                if (!this.realized)
                    return TraverseVisitFlags.SKIP_CHILDREN;

                this.emit('unrealize');

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
            if (was_mapped)
                this.hide();

            console.assert(!this.mapped);

            /* unrealize self and all children */
            this._unrealize_not_hiding();

            if (callback) callback.call(this);

            if (was_visible) {
                this.show(); /* will realize only if mapping implies it */
            } else if (was_realized) {
                this.realize(); /* realize self and all parents */
            }
        },


        get reactive() { return this.flags & ActorFlags.REACTIVE; },
        get no_layout() { return this.flags & ActorFlags.NO_LAYOUT; },


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
 * Return value: (transfer none) (type Clutter.Actor): the stage
 *   containing the actor, or %NULL
 *
 * Since: 0.8
 */
        get stage() {
            return this._get_stage_internal();
        },

/**
 * clutter_actor_grab_key_focus:
 * @self: a #ClutterActor
 *
 * Sets the key focus of the #ClutterStage including @self
 * to this #ClutterActor.
 *
 * Since: 1.0
 */
        grab_key_focus: function() {
            var stage = this._get_stage_internal();
            if (stage)
                stage.set_key_focus(this);
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
        _traverse: function(flags, before, after) {
            if (flags & TraverseFlags.BREADTH_FIRST) {
                this._traverse_breadth(before);
            } else {
                this._traverse_depth(before, after, 0 /* start depth */);
            }
        },
        _traverse_depth: function(before_children_cb, after_children_cb,
                                  current_depth) {
            var flags = 0;

            if (before_children_cb)
                flags = before_children_cb.call(this, current_depth);

            if (flags & TraverseVisitFlags.BREAK)
                return TraverseVisitFlags.BREAK;

            if (!(flags & TraverseVisitFlags.SKIP_CHILDREN)) {
                var iter;

                for (iter = this.first_child;
                     iter;
                     iter = iter.next_sibling) {
                    flags = iter._traverse_depth(before_children_cb,
                                                 after_children_cb,
                                                 current_depth + 1);

                    if (flags & TraverseVisitFlags.BREAK)
                        return TraverseVisitFlags.BREAK;
                }
            }

            if (after_children_cb) {
                return after_children_cb.call(this, current_depth);
            }
            return TraverseVisitFlags.CONTINUE;
        },
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
                    actor._foreach_child(function() {
                        queue.push(this);
                        return true;
                    });
                }
            }
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
        has_constraints: function() {
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
        has_actions: function() {
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

        get background_color_set() {
            return this[PRIVATE].bg_color_set;
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
            if (priv.bg_color_set && Color.equal(color, priv.bg_color))
                return;

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

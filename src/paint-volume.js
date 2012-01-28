/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./vertex"], function(Vertex) {

    var PaintVolumeFlags = {
        IS_EMPTY:        1 << 0,
        IS_COMPLETE:     1 << 1,
        IS_2D:           1 << 2,
        IS_AXIS_ALIGNED: 1 << 3
    };
    PaintVolumeFlags.DEFAULT_FLAGS =
        PaintVolumeFlags.IS_EMPTY |
        PaintVolumeFlags.IS_AXIS_ALIGNED |
        PaintVolumeFlags.IS_COMPLETE |
        PaintVolumeFlags.IS_2d;
    Object.freeze(PaintVolumeFlags);

    var KEY_VERTICES = [ 0, 1, 3, 4 ];
    Object.freeze(KEY_VERTICES);

    var PaintVolume = function() {
        this._init();
    };
    PaintVolume.prototype = {
        _init: function() {
            /* A paint volume represents a volume in a given actors private
             * coordinate system. */
            this.actor = null;
            /* cuboid for the volume:
             *
             *       4━━━━━━━┓5
             *    ┏━━━━━━━━┓╱┃
             *    ┃0 ┊7   1┃ ┃
             *    ┃   ┄┄┄┄┄┃┄┃6
             *    ┃3      2┃╱
             *    ┗━━━━━━━━┛
             *
             *   0: top, left (origin)  : always valid
             *   1: top, right          : always valid
             *   2: bottom, right       :  updated lazily
             *   3: bottom, left        : always valid
             *
             *   4: top, left, back     : always valid
             *   5: top, right, back    :  updated lazily
             *   6: bottom, right, back :  updated lazily
             *   7: bottom, left, back  :  updated lazily
             *
             * Elements 0, 1, 3 and 4 are filled in by the PaintVolume setters
             *
             * Note: the reason for this ordering is that we can simply ignore
             * elements 4, 5, 6 and 7 most of the time for 2D actors when
             * calculating the projected paint box.
             */
            this.vertices = [null,null,null,null,
                             null,null,null,null];
            var i;
            for (i=0; i<this.vertices.length; i++) {
                this.vertices[i] = new Vertex(0,0,0);
            }

            this.flags = PaintVolumeFlags.DEFAULT_FLAGS;

            this.init(); // rest of initialization (unnecessary)
        },
        /** Zero out paint volume. */
        init: function() {
            var i;
            for (i=0; i<this.vertices.length; i++) {
                this.vertices[i].init();
            }
            this.flags = PaintVolumeFlags.DEFAULT_FLAGS;
        },
        /* A newly initialized PaintVolume is considered empty as it is
         * degenerate on all three axis.
         *
         * We consider this carefully when we union an empty volume with
         * another so that the union simply results in a copy of the other
         * volume instead of also bounding the origin of the empty volume.
         *
         * For example this is a convenient property when calculating the
         * volume of a container as the union of the volume of its children
         * where the initial volume passed to the containers
         * ->get_paint_volume method will be empty. */
        get is_empty() {
            return !!(this.flags & PaintVolumeFlags.IS_EMPTY);
        },
        set is_empty(is_empty) {
            if (is_empty) {
                this.flags |= PaintVolumeFlags.IS_EMPTY;
            } else {
                this.flags &= (~PaintVolumeFlags.IS_EMPTY);
            }
        },

        /* TRUE when we've updated the values we calculate lazily */
        get is_complete() {
            return !!(this.flags & PaintVolumeFlags.IS_COMPLETE);
        },
        set is_complete(is_complete) {
            if (is_complete) {
                this.flags |= PaintVolumeFlags.IS_COMPLETE;
            } else {
                this.flags &= (~PaintVolumeFlags.IS_COMPLETE);
            }
        },

        /* TRUE if vertices 4-7 can be ignored. (Only valid if complete is
         * TRUE) */
        get is_2d() {
            return !!(this.flags & PaintVolumeFlags.IS_2D);
        },
        set is_2d(is_2d) {
            if (is_2d) {
                this.flags |= PaintVolumeFlags.IS_2D;
            } else {
                this.flags &= (~PaintVolumeFlags.IS_2D);
            }
        },

        /* Set to TRUE initialy but cleared if the paint volume is
         * transfomed by a matrix. */
        get is_axis_aligned() {
            return !!(this.flags & PaintVolumeFlags.IS_AXIS_ALIGNED);
        },
        set is_axis_aligned(is_axis_aligned) {
            if (is_axis_aligned) {
                this.flags |= PaintVolumeFlags.IS_AXIS_ALIGNED;
            } else {
                this.flags &= (~PaintVolumeFlags.IS_AXIS_ALIGNED);
            }
        },

        /* Note: There is a precedence to the above bitfields that should be
         * considered whenever we implement code that manipulates
         * PaintVolumes...
         *
         * Firstly if ->is_empty == TRUE then the values for ->is_complete
         * and ->is_2d are undefined, so you should typically check
         * ->is_empty as the first priority.
         *
         * XXX: document other invariables...
         */

        // ---------------------------------------------------
        /**
         * clutter_paint_volume_copy:
         * @pv: a #ClutterPaintVolume
         *
         * Copies @pv into a new #ClutterPaintVolume
         *
         * Return value: a newly allocated copy of a #ClutterPaintVolume
         *
         * Since: 1.6
         */
        copy: function() {
            var pv = new PaintVolume();
            pv.set_from_volume(this);
            return pv;
        },
        set_from_volume: function(pv) {
            this.actor = pv.actor;
            this.flags = pv.flags;
            var i;
            for (i=0; i<pv.vertices.length; i++) {
                this.vertices[i].set_from_vertex(pv.vertices[i]);
            }
        },
        /**
         * clutter_paint_volume_set_origin:
         * @pv: a #ClutterPaintVolume
         * @origin: a #ClutterVertex
         *
         * Sets the origin of the paint volume.
         *
         * The origin is defined as the X, Y and Z coordinates of the top-left
         * corner of an actor's paint volume, in actor coordinates.
         *
         * The default is origin is assumed at: (0, 0, 0)
         *
         * Since: 1.6
         */
        set origin(origin) {
            var dx = origin.x - this.vertices[0].x;
            var dy = origin.y - this.vertices[0].y;
            var dz = origin.z - this.vertices[0].z;

            /* If we change the origin then all the key vertices of the paint
             * volume need to be shifted too... */
            var i;
            for (i = 0; i < 4; i++) {
                this.vertices[KEY_VERTICES[i]].x += dx;
                this.vertices[KEY_VERTICES[i]].y += dy;
                this.vertices[KEY_VERTICES[i]].z += dz;
            }

            this.is_complete = false;
        },
        /**
         * clutter_paint_volume_get_origin:
         * @pv: a #ClutterPaintVolume
         * @vertex: (out): the return location for a #ClutterVertex
         *
         * Retrieves the origin of the #ClutterPaintVolume.
         *
         * Since: 1.6
         */
        get origin() {
            return this.vertices[0];
        },
        _update_is_empty: function() {
            if (this.vertices[0].x === this.vertices[1].x &&
                this.vertices[0].y === this.vertices[3].y &&
                this.vertices[0].z === this.vertices[4].z) {
                this.is_empty = true;
            } else {
                this.is_empty = false;
            }
        },
        /**
         * clutter_paint_volume_set_width:
         * @pv: a #ClutterPaintVolume
         * @width: the width of the paint volume, in pixels
         *
         * Sets the width of the paint volume. The width is measured along
         * the x axis in the actor coordinates that @pv is associated with.
         *
         * Since: 1.6
         */
        set width(width) {
            console.assert(width >= 0);

            /* If the volume is currently empty then only the origin is
             * currently valid */
            if (this.is_empty) {
                this.vertices[1].set_from_vertex(this.vertices[0]);
                this.vertices[3].set_from_vertex(this.vertices[0]);
                this.vertices[4].set_from_vertex(this.vertices[0]);
            }

            if (!this.is_axis_aligned) {
                this._axis_align();
            }

            var right_xpos = this.vertices[0].x + width;

            /* Move the right vertices of the paint box relative to the
             * origin... */
            this.vertices[1].x = right_xpos;
            /* this.vertices[2].x = right_xpos; NB: updated lazily */
            /* this.vertices[5].x = right_xpos; NB: updated lazily */
            /* this.vertices[6].x = right_xpos; NB: updated lazily */

            this.is_complete = false;

            this._update_is_empty();
        },
        /**
         * clutter_paint_volume_get_width:
         * @pv: a #ClutterPaintVolume
         *
         * Retrieves the width of the volume's, axis aligned, bounding box.
         *
         * In other words; this takes into account what actor's coordinate
         * space @pv belongs too and conceptually fits an axis aligned box
         * around the volume. It returns the size of that bounding box as
         * measured along the x-axis.
         *
         * <note><para>If, for example, clutter_actor_get_transformed_paint_volume()
         * is used to transform a 2D child actor that is 100px wide, 100px
         * high and 0px deep into container coordinates then the width might
         * not simply be 100px if the child actor has a 3D rotation applied to
         * it.</para>
         * <para>Remember; after clutter_actor_get_transformed_paint_volume() is
         * used then a transformed child volume will be defined relative to the
         * ancestor container actor and so a 2D child actor
         * can have a 3D bounding volume.</para></note>
         *
         * <note>There are no accuracy guarantees for the reported width,
         * except that it must always be >= to the true width. This is
         * because actors may report simple, loose fitting paint-volumes
         * for efficiency</note>

         * Return value: the width, in units of @pv's local coordinate system.
         *
         * Since: 1.6
         */
        get width() {
            if (this.is_empty) {
                return 0;
            } else if (!this.is_axis_aligned) {
                var pv = this.copy();
                pv._axis_align();
                return pv.vertices[1].x - pv.vertices[0].x;
            } else {
                return this.vertices[1].x - this.vertices[0].x;
            }
        },
        /**
         * clutter_paint_volume_set_height:
         * @pv: a #ClutterPaintVolume
         * @height: the height of the paint volume, in pixels
         *
         * Sets the height of the paint volume. The height is measured along
         * the y axis in the actor coordinates that @pv is associated with.
         *
         * Since: 1.6
         */
        set height(height) {
            console.assert(height >= 0);

            /* If the volume is currently empty then only the origin is
             * currently valid */
            if (this.is_empty) {
                this.vertices[1].set_from_vertex(this.vertices[0]);
                this.vertices[3].set_from_vertex(this.vertices[0]);
                this.vertices[4].set_from_vertex(this.vertices[0]);
            }

            if (!this.is_axis_aligned) {
                this._axis_align();
            }

            var height_ypos = this.vertices[0].y + height;

            /* Move the bottom vertices of the paint box relative to the
             * origin... */
            /* this.vertices[2].y = height_ypos; NB: updated lazily */
            this.vertices[3].y = height_ypos;
            /* this.vertices[6].y = height_ypos; NB: updated lazily */
            /* this.vertices[7].y = height_ypos; NB: updated lazily */
            this.is_complete = false;

            this._update_is_empty();
        },
        /**
         * clutter_paint_volume_get_height:
         * @pv: a #ClutterPaintVolume
         *
         * Retrieves the height of the volume's, axis aligned, bounding box.
         *
         * In other words; this takes into account what actor's coordinate
         * space @pv belongs too and conceptually fits an axis aligned box
         * around the volume. It returns the size of that bounding box as
         * measured along the y-axis.
         *
         * <note><para>If, for example, clutter_actor_get_transformed_paint_volume()
         * is used to transform a 2D child actor that is 100px wide, 100px
         * high and 0px deep into container coordinates then the height might
         * not simply be 100px if the child actor has a 3D rotation applied to
         * it.</para>
         * <para>Remember; after clutter_actor_get_transformed_paint_volume() is
         * used then a transformed child volume will be defined relative to the
         * ancestor container actor and so a 2D child actor
         * can have a 3D bounding volume.</para></note>
         *
         * <note>There are no accuracy guarantees for the reported height,
         * except that it must always be >= to the true height. This is
         * because actors may report simple, loose fitting paint-volumes
         * for efficiency</note>
         *
         * Return value: the height, in units of @pv's local coordinate system.
         *
         * Since: 1.6
         */
        get height() {
            if (this.is_empty) {
                return 0;
            } else if (!this.is_axis_aligned) {
                var pv = this.copy();
                pv._axis_align();
                return pv.vertices[3].y - pv.vertices[0].y;
            } else {
                return this.vertices[3].y - this.vertices[0].y;
            }
        },
        /**
         * clutter_paint_volume_set_depth:
         * @pv: a #ClutterPaintVolume
         * @depth: the depth of the paint volume, in pixels
         *
         * Sets the depth of the paint volume. The depth is measured along
         * the z axis in the actor coordinates that @pv is associated with.
         *
         * Since: 1.6
         */
        set depth(depth) {
            console.assert(depth >= 0);

            /* If the volume is currently empty then only the origin is
             * currently valid */
            if (this.is_empty) {
                this.vertices[1].set_from_vertex(this.vertices[0]);
                this.vertices[3].set_from_vertex(this.vertices[0]);
                this.vertices[4].set_from_vertex(this.vertices[0]);
            }

            if (!this.is_axis_aligned) {
                this._axis_align();
            }

            var depth_zpos = this.vertices[0].z + depth;

            /* Move the back vertices of the paint box relative to the
             * origin... */
            this.vertices[4].z = depth_zpos;
            /* this.vertices[5].z = depth_zpos; NB: updated lazily */
            /* this.vertices[6].z = depth_zpos; NB: updated lazily */
            /* this.vertices[7].z = depth_zpos; NB: updated lazily */

            this.is_complete = false;
            this.is_2d = (depth!==0) ? false : true;

            this._update_is_empty();
        },
        /**
         * clutter_paint_volume_get_depth:
         * @pv: a #ClutterPaintVolume
         *
         * Retrieves the depth of the volume's, axis aligned, bounding box.
         *
         * In other words; this takes into account what actor's coordinate
         * space @pv belongs too and conceptually fits an axis aligned box
         * around the volume. It returns the size of that bounding box as
         * measured along the z-axis.
         *
         * <note><para>If, for example, clutter_actor_get_transformed_paint_volume()
         * is used to transform a 2D child actor that is 100px wide, 100px
         * high and 0px deep into container coordinates then the depth might
         * not simply be 0px if the child actor has a 3D rotation applied to
         * it.</para>
         * <para>Remember; after clutter_actor_get_transformed_paint_volume() is
         * used then the transformed volume will be defined relative to the
         * container actor and in container coordinates a 2D child actor
         * can have a 3D bounding volume.</para></note>
         *
         * <note>There are no accuracy guarantees for the reported depth,
         * except that it must always be >= to the true depth. This is
         * because actors may report simple, loose fitting paint-volumes
         * for efficiency.</note>
         *
         * Return value: the depth, in units of @pv's local coordinate system.
         *
         * Since: 1.6
         */
        get depth() {
            if (this.is_empty) {
                return 0;
            } else if (!this.is_axis_aligned) {
                var pv = this.copy();
                pv._axis_align();
                return pv.vertices[4].z - pv.vertices[0].z;
            } else {
                return this.vertices[4].z - this.vertices[0].z;
            }
        },

        /**
         * clutter_paint_volume_union:
         * @pv: The first #ClutterPaintVolume and destination for resulting
         *      union
         * @another_pv: A second #ClutterPaintVolume to union with @pv
         *
         * Updates the geometry of @pv to encompass @pv and @another_pv.
         *
         * <note>There are no guarantees about how precisely the two volumes
         * will be encompassed.</note>
         *
         * Since: 1.6
         */
        union: function(another_pv) {
            console.assert(another_pv);
            /* Both volumes have to belong to the same local coordinate space */
            console.assert(this.actor === another_pv.actor);

            /* NB: we only have to update vertices 0, 1, 3 and 4
             * (See the ClutterPaintVolume typedef for more details) */

            /* We special case empty volumes because otherwise we'd end up
             * calculating a bounding box that would enclose the origin of
             * the empty volume which isn't desired.
             */
            if (another_pv.is_empty) {
                return;
            }

            if (this.is_empty) {
                this.set_from_volume(another_pv);
                return;
            }

            if (!this.is_axis_aligned) {
                this._axis_align();
            }

            if (!another_pv.is_axis_aligned) {
                another_pv = another_pv.copy();
                another_pv._axis_align();
            }

            /* grow left*/
            /* left vertices 0, 3, 4, 7 */
            if (another_pv.vertices[0].x < this.vertices[0].x) {
                var min_x = another_pv.vertices[0].x;
                this.vertices[0].x = min_x;
                this.vertices[3].x = min_x;
                this.vertices[4].x = min_x;
                /* this.vertices[7].x = min_x; */
            }

            /* grow right */
            /* right vertices 1, 2, 5, 6 */
            if (another_pv.vertices[1].x > this.vertices[1].x) {
                var max_x = another_pv.vertices[1].x;
                this.vertices[1].x = max_x;
                /* this.vertices[2].x = max_x; */
                /* this.vertices[5].x = max_x; */
                /* this.vertices[6].x = max_x; */
            }

            /* grow up */
            /* top vertices 0, 1, 4, 5 */
            if (another_pv.vertices[0].y < this.vertices[0].y) {
                var min_y = another_pv.vertices[0].y;
                this.vertices[0].y = min_y;
                this.vertices[1].y = min_y;
                this.vertices[4].y = min_y;
                /* this.vertices[5].y = min_y; */
            }

            /* grow down */
            /* bottom vertices 2, 3, 6, 7 */
            if (another_pv.vertices[3].y > this.vertices[3].y) {
                var may_y = another_pv.vertices[3].y;
                /* this.vertices[2].y = may_y; */
                this.vertices[3].y = may_y;
                /* this.vertices[6].y = may_y; */
                /* this.vertices[7].y = may_y; */
            }

            /* grow forward */
            /* front vertices 0, 1, 2, 3 */
            if (another_pv.vertices[0].z < this.vertices[0].z) {
                var min_z = another_pv.vertices[0].z;
                this.vertices[0].z = min_z;
                this.vertices[1].z = min_z;
                /* this.vertices[2].z = min_z; */
                this.vertices[3].z = min_z;
            }

            /* grow backward */
            /* back vertices 4, 5, 6, 7 */
            if (another_pv.vertices[4].z > this.vertices[4].z) {
                var maz_z = another_pv.vertices[4].z;
                this.vertices[4].z = maz_z;
                /* this.vertices[5].z = maz_z; */
                /* this.vertices[6].z = maz_z; */
                /* this.vertices[7].z = maz_z; */
            }

            if (this.vertices[4].z === this.vertices[0].z) {
                this.is_2d = true;
            } else {
                this.is_2d = false;
            }

            this.is_empty = false;
            this.is_complete = false;
        },

        /* The paint_volume setters only update vertices 0, 1, 3 and
         * 4 since the others can be drived from them.
         *
         * This will set pv->completed = TRUE;
         */
        _complete: function() {
            if (this.is_empty) {
                return;
            }

            if (this.is_complete) {
                return;
            }

            /* Find the vector that takes us from any vertex on the left face to
             * the corresponding vertex on the right face. */
            var dx_l2r = this.vertices[1].x - this.vertices[0].x;
            var dy_l2r = this.vertices[1].y - this.vertices[0].y;
            var dz_l2r = this.vertices[1].z - this.vertices[0].z;

            /* Find the vector that takes us from any vertex on the top face to
             * the corresponding vertex on the bottom face. */
            var dx_t2b = this.vertices[3].x - this.vertices[0].x;
            var dy_t2b = this.vertices[3].y - this.vertices[0].y;
            var dz_t2b = this.vertices[3].z - this.vertices[0].z;

            /* front-bottom-right */
            this.vertices[2].x = this.vertices[3].x + dx_l2r;
            this.vertices[2].y = this.vertices[3].y + dy_l2r;
            this.vertices[2].z = this.vertices[3].z + dz_l2r;

            if (!this.is_2d) {
                /* back-top-right */
                this.vertices[5].x = this.vertices[4].x + dx_l2r;
                this.vertices[5].y = this.vertices[4].y + dy_l2r;
                this.vertices[5].z = this.vertices[4].z + dz_l2r;

                /* back-bottom-right */
                this.vertices[6].x = this.vertices[5].x + dx_t2b;
                this.vertices[6].y = this.vertices[5].y + dy_t2b;
                this.vertices[6].z = this.vertices[5].z + dz_t2b;

                /* back-bottom-left */
                this.vertices[7].x = this.vertices[4].x + dx_t2b;
                this.vertices[7].y = this.vertices[4].y + dy_t2b;
                this.vertices[7].z = this.vertices[4].z + dz_t2b;
            }

            this.is_complete = true;
        },

        /*<private>
         * _clutter_paint_volume_get_box:
         * @pv: a #ClutterPaintVolume
         * @box: a pixel aligned #ClutterGeometry
         *
         * Transforms a 3D paint volume into a 2D bounding box in the
         * same coordinate space as the 3D paint volume.
         *
         * To get an actors "paint box" you should first project
         * the paint volume into window coordinates before getting
         * the 2D bounding box.
         *
         * <note>The coordinates of the returned box are not clamped to
         * integer pixel values, if you need them to be clamped you can use
         * clutter_actor_box_clamp_to_pixel()</note>
         *
         * Since: 1.6
         */
        _get_bounding_box: function() {
            var x_min, y_min, x_max, y_max;
            var count, i;
            var box = {}; // CSA XXX new ActorBox?

            if (this.is_empty) {
                box.x1 = box.x2 = this.vertices[0].x;
                box.y1 = box.y2 = this.vertices[0].y;
                return box;
            }

            /* Updates the vertices we calculate lazily
             * (See ClutterPaintVolume typedef for more details) */
            this._complete();

            var vertices = this.vertices;

            x_min = x_max = vertices[0].x;
            y_min = y_max = vertices[0].y;

            /* Most actors are 2D so we only have to look at the front 4
             * vertices of the paint volume... */
            if (this.is_2d) {
                count = 4;
            } else {
                count = 8;
            }

            for (i = 1; i < count; i++) {
                if (vertices[i].x < x_min) {
                    x_min = vertices[i].x;
                } else if (vertices[i].x > x_max) {
                    x_max = vertices[i].x;
                }

                if (vertices[i].y < y_min) {
                    y_min = vertices[i].y;
                } else if (vertices[i].y > y_max) {
                    y_max = vertices[i].y;
                }
            }

            box.x1 = x_min;
            box.y1 = y_min;
            box.x2 = x_max;
            box.y2 = y_max;
            return box;
        },

        /* Given a paint volume that has been transformed by an arbitrary
         * modelview and is no longer axis aligned, this derives a replacement
         * that is axis aligned. */
        _axis_align: function() {
            var count, i;
            var origin;
            var max_x, max_y, max_z;

            if (this.is_empty) {
                return;
            }

            if (this.is_axis_aligned) {
                return;
            }

            if (this.vertices[0].x === this.vertices[1].x &&
                this.vertices[0].y === this.vertices[3].y &&
                this.vertices[0].z === this.vertices[4].y) {
                this.is_axis_aligned = true;
                return;
            }

            if (!this.is_complete) {
                this._complete();
            }

            origin = this.vertices[0].copy();
            max_x = this.vertices[0].x;
            max_y = this.vertices[0].y;
            max_z = this.vertices[0].z;

            count = this.is_2d ? 4 : 8;
            for (i = 1; i < count; i++) {
                if (this.vertices[i].x < origin.x) {
                    origin.x = this.vertices[i].x;
                } else if (this.vertices[i].x > max_x) {
                    max_x = this.vertices[i].x;
                }

                if (this.vertices[i].y < origin.y) {
                    origin.y = this.vertices[i].y;
                } else if (this.vertices[i].y > max_y) {
                    max_y = this.vertices[i].y;
                }

                if (this.vertices[i].z < origin.z) {
                    origin.z = this.vertices[i].z;
                } else if (this.vertices[i].z > max_z) {
                    max_z = this.vertices[i].z;
                }
            }

            this.vertices[0].set_from_vertex(origin);

            this.vertices[1].x = max_x;
            this.vertices[1].y = origin.y;
            this.vertices[1].z = origin.z;

            this.vertices[3].x = origin.x;
            this.vertices[3].y = max_y;
            this.vertices[3].z = origin.z;

            this.vertices[4].x = origin.x;
            this.vertices[4].y = origin.y;
            this.vertices[4].z = max_z;

            this.is_complete = false;
            this.is_axis_aligned = true;

            if (this.vertices[4].z === this.vertices[0].z) {
                this.is_2d = true;
            } else {
                this.is_2d = false;
            }
        }
    };
    return PaintVolume;
});

/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    /** ClutterActorBox */

/**
 * ClutterActorBox:
 * @x1: X coordinate of the top left corner
 * @y1: Y coordinate of the top left corner
 * @x2: X coordinate of the bottom right corner
 * @y2: Y coordinate of the bottom right corner
 *
 * Bounding box of an actor. The coordinates of the top left and right bottom
 * corners of an actor. The coordinates of the two points are expressed in
 * pixels with sub-pixel precision
 */
    var ActorBox = function(x1, y1, x2, y2) {
        this.set(x1||0, y1||0, x2||0, y2||0);
    };
    ActorBox.prototype = {
        // fields
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        // methods
        set: function(x1, y1, x2, y2) {
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        },
        set_from_actorbox: function(ab) {
            this.x1 = ab.x1;
            this.y1 = ab.y1;
            this.x2 = ab.x2;
            this.y2 = ab.y2;
            return this;
        },
        copy: function() {
            return new ActorBox(this.x1, this.y1, this.x2, this.y2);
        },
        equals: function(ab) {
            return ActorBox.equals(this, ab);
        },
        // special methods
/**
 * clutter_actor_box_get_x:
 * @box: a #ClutterActorBox
 *
 * Retrieves the X coordinate of the origin of @box
 *
 * Return value: the X coordinate of the origin
 *
 * Since: 1.0
 */
        get x() { return this.x1; },
/**
 * clutter_actor_box_get_y:
 * @box: a #ClutterActorBox
 *
 * Retrieves the Y coordinate of the origin of @box
 *
 * Return value: the Y coordinate of the origin
 *
 * Since: 1.0
 */
        get y() { return this.y1; },
/**
 * clutter_actor_box_get_width:
 * @box: a #ClutterActorBox
 *
 * Retrieves the width of the @box
 *
 * Return value: the width of the box
 *
 * Since: 1.0
 */
        get width() { return this.x2 - this.x1; },
/**
 * clutter_actor_box_get_height:
 * @box: a #ClutterActorBox
 *
 * Retrieves the height of the @box
 *
 * Return value: the height of the box
 *
 * Since: 1.0
 */
        get height() { return this.y2 - this.y1; },
/**
 * clutter_actor_box_get_origin:
 * @box: a #ClutterActorBox
 * @x: (out) (allow-none): return location for the X coordinate, or %NULL
 * @y: (out) (allow-none): return location for the Y coordinate, or %NULL
 *
 * Retrieves the origin of @box
 *
 * Since: 1.0
 */
        get origin() {
            return { x: this.x1, y: this.y1 };
        },
/**
 * clutter_actor_box_get_size:
 * @box: a #ClutterActorBox
 * @width: (out) (allow-none): return location for the width, or %NULL
 * @height: (out) (allow-none): return location for the height, or %NULL
 *
 * Retrieves the size of @box
 *
 * Since: 1.0
 */
        get size() {
            return {
                width: this.x2 - this.x1,
                height: this.y2 - this.y1
            };
        },
/**
 * clutter_actor_box_get_area:
 * @box: a #ClutterActorBox
 *
 * Retrieves the area of @box
 *
 * Return value: the area of a #ClutterActorBox, in pixels
 *
 * Since: 1.0
 */
        get area() {
            return (this.x2 - this.x1) * (this.y2 - this.y1);
        },
 /**
 * clutter_actor_box_contains:
 * @box: a #ClutterActorBox
 * @x: X coordinate of the point
 * @y: Y coordinate of the point
 *
 * Checks whether a point with @x, @y coordinates is contained
 * withing @box
 *
 * Return value: %TRUE if the point is contained by the #ClutterActorBox
 *
 * Since: 1.0
 */
        contains: function(x, y) {
            return (x > this.x1 && x < this.x2) &&
                   (y > this.y1 && y < this.y2);
        },
        interpolate: function(final_, progress) {
            return ActorBox.interpolate(this, final_, progress);
        },
/**
 * clutter_actor_box_clamp_to_pixel:
 * @box: (inout): the #ClutterActorBox to clamp
 *
 * Clamps the components of @box to the nearest integer
 *
 * Since: 1.2
 */
        clamp_to_pixel: function() {
            this.x1 = Math.floor(this.x1);
            this.y1 = Math.floor(this.y1);
            this.x2 = Math.ceil(this.x2);
            this.y2 = Math.ceil(this.y2);
        },
        union: function(b) {
            return ActorBox.union(this, b);
        },
/**
 * clutter_actor_box_set_origin:
 * @box: a #ClutterActorBox
 * @x: the X coordinate of the new origin
 * @y: the Y coordinate of the new origin
 *
 * Changes the origin of @box, maintaining the size of the #ClutterActorBox.
 *
 * Since: 1.6
 */
        set origin(origin) {
            var width = this.width;
            var height = this.height;

            this.x1 = origin.x||0;
            this.y1 = origin.y||0;
            this.x2 = this.x1 + width;
            this.y2 = this.y1 + height;
        },
/**
 * clutter_actor_box_set_size:
 * @box: a #ClutterActorBox
 * @width: the new width
 * @height: the new height
 *
 * Sets the size of @box, maintaining the origin of the #ClutterActorBox.
 *
 * Since: 1.6
 */
        set size(size) {
            this.x2 = this.x1 + size.width;
            this.y2 = this.y1 + size.height;
        }
    };
    ActorBox.copy = function(ab) {
        if (ab) {
            ab = ab.copy();
        }
        return ab;
    };
    ActorBox.equals = function(a, b) {
        if (a===b) { return true; }
        return a.x1 === b.x1 &&
            a.y1 === b.y1 &&
            a.x2 === b.x2 &&
            a.y2 === b.y2;
    };
/**
 * clutter_actor_box_from_vertices:
 * @box: a #ClutterActorBox
 * @verts: (array fixed-size=4): array of four #ClutterVertex
 *
 * Calculates the bounding box represented by the four vertices; for details
 * of the vertex array see clutter_actor_get_abs_allocation_vertices().
 *
 * Since: 1.0
 */
    ActorBox.from_vertices = function(verts) {
        var x1 = Math.min(verts[0].x, verts[1].x, verts[2].x, verts[3].x);
        var y1 = Math.min(verts[0].y, verts[1].y, verts[2].y, verts[3].y);
        var x2 = Math.max(verts[0].x, verts[1].x, verts[2].x, verts[3].x);
        var y2 = Math.max(verts[0].y, verts[1].y, verts[2].y, verts[3].y);
        return new ActorBox(x1, y1, x2, y2);
    };
/**
 * clutter_actor_box_interpolate:
 * @initial: the initial #ClutterActorBox
 * @final: the final #ClutterActorBox
 * @progress: the interpolation progress
 * @result: (out): return location for the interpolation
 *
 * Interpolates between @initial and @final #ClutterActorBox<!-- -->es
 * using @progress
 *
 * Since: 1.2
 */
    ActorBox.interpolate = function(initial, final_, progress) {
        var x1 = initial.x1 + (final_.x1 - initial.x1) * progress;
        var y1 = initial.y1 + (final_.y1 - initial.y1) * progress;
        var x2 = initial.x2 + (final_.x2 - initial.x2) * progress;
        var y2 = initial.y2 + (final_.y2 - initial.y2) * progress;
        return new ActorBox(x1, y1, x2, y2);
    };
/**
 * clutter_actor_box_union:
 * @a: (in) the first #ClutterActorBox
 * @b: (in): the second #ClutterActorBox
 * @result: (out): the #ClutterActorBox representing a union
 *   of @a and @b
 *
 * Unions the two boxes @a and @b and stores the result in @result.
 *
 * Since: 1.4
 */
    ActorBox.union = function(a, b) {
        var x1 = Math.min(a.x1, b.x1);
        var y1 = Math.min(a.y1, b.y1);
        var x2 = Math.max(a.x2, b.x2);
        var y2 = Math.max(a.y2, b.y2);
        return new ActorBox(x1, y1, x2, y2);
    };
    return ActorBox;
});

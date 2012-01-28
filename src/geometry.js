/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    /** ClutterGeometry */

/**
 * ClutterGeometry:
 * @x: X coordinate of the top left corner of an actor
 * @y: Y coordinate of the top left corner of an actor
 * @width: width of an actor
 * @height: height of an actor
 *
 * The rectangle containing an actor's bounding box, measured in pixels.
 */
    function Geometry(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    Geometry.prototype = {
        copy: function() {
            return new Geometry(this.x, this.y, this.width, this.height);
        },
        equals: function(g) {
            return Geometry.equals(this, g);
        },
        progress: function(b, progress) {
            return Geometry.progress(this, b, progress);
        },
        union: function(g) {
            return Geometry.union(this, g);
        },
        intersects: function(g) {
            return Geometry.intersects(this, g);
        }
    };
    Geometry.copy = function(g) {
        if (g) {
            g = g.copy();
        }
        return g;
    };
    Geometry.equals = function(a, b) {
        if (a === b) { return true; }

        return a.x === b.x && a.y === b.y &&
            a.width === b.width && a.height === b.height;
    };
    Geometry.progress = function(a, b, progress) {
        return new Geometry(a.x + (b.x - a.x) * progress,
                            a.y + (b.y - a.y) * progress,
                            a.width + (b.width - a.width) * progress,
                            a.height + (b.height - a.height) * progress);
    };
/**
 * clutter_geometry_union:
 * @geometry_a: a #ClutterGeometry
 * @geometry_b: another #ClutterGeometry
 * @result: (out): location to store the result
 *
 * Find the union of two rectangles represented as #ClutterGeometry.
 *
 * Since: 1.4
 */
    Geometry.union = function(a, b) {
        var x1 = Math.min(a.x, b.x);
        var y1 = Math.min(a.y, b.y);
        var x2 = Math.max(a.x + a.width, b.x + b.width);
        var y2 = Math.max(a.y + a.height, b.y + b.height);
        return new Geometry(x1, y1, x2 - x1, y2 - y1);
    };
/**
 * clutter_geometry_intersects:
 * @geometry0: The first geometry to test
 * @geometry1: The second geometry to test
 *
 * Determines if @geometry0 and geometry1 intersect returning %TRUE if
 * they do else %FALSE.
 *
 * Return value: %TRUE of @geometry0 and geometry1 intersect else
 * %FALSE.
 *
 * Since: 1.4
 */
    Geometry.intersects = function(a, b) {
        if (b.x >= (a.x + a.width) ||
            b.y >= (a.y + a.height) ||
            (b.x + b.width) <= a.x ||
            (b.y + b.height) <= a.y) {
            return false;
        }
        return true;
    };

    return Geometry;
});

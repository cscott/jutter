define([], function() {
    /** ClutterVertex */

/**
 * clutter_vertex_new:
 * @x: X coordinate
 * @y: Y coordinate
 * @z: Z coordinate
 *
 * Creates a new #ClutterVertex for the point in 3D space
 * identified by the 3 coordinates @x, @y, @z
 *
 * Return value: the newly allocate #ClutterVertex. Use
 *   clutter_vertex_free() to free the resources
 *
 * Since: 1.0
 */
    function Vertex(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vertex.prototype = {
        copy: function() {
            return new Vertex(this.x, this.y, this.z);
        },
        equals: function(v) {
            return Vertex.equals(this, v);
        },
        progress: function(b, progress) {
            return Vertex.progress(this, b, progress);
        }
    };
    Vertex.copy = function(v) {
        if (v)
            v = v.copy();
        return v;
    };
    Vertex.equals = function(a, b) {
        if (a === b) return true;

        return a.x === b.x && a.y === b.y && a.z === b.z;
    };
    Vertex.progress = function(a, b, progress) {
        return new Vertex(a.x + (b.x - a.x) * progress,
                          a.y + (b.y - a.y) * progress,
                          a.z + (b.z - a.z) * progress);
    };

    return Vertex;
});

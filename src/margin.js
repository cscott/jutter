/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    /** ClutterMargin */

/**
 * ClutterMargin:
 * @left: the margin from the left
 * @right: the margin from the right
 * @top: the margin from the top
 * @bottom: the margin from the bottom
 *
 * A representation of the components of a margin.
 *
 * Since: 1.10
 */
    var Margin = function() {
    };
    Margin.prototype = {
        // fields
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        // methods
        set_from_margin: function(m) {
            this.left = m.left;
            this.right = m.right;
            this.top = m.top;
            this.bottom = m.bottom;
            return this;
        },
        copy: function() {
            return (new Margin()).set_from_margin(this);
        },
        equals: function(m) {
            return Margin.equals(this, m);
        }
    };
    Margin.copy = function(m) {
        if (m) {
            m = m.copy();
        }
        return m;
    };
    Margin.equals = function(a, b) {
        if (a===b) { return true; }
        return a.left === b.left &&
            a.right === b.right &&
            a.top === b.top &&
            a.bottom === b.bottom;
    };

    return Margin;
});

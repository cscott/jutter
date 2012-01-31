/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./color", "./signals"], function(Actor, Color, Signals) {

    var PRIVATE = "_rectangle_private";
    var RectanglePrivate = function() {
        this._init();
    };
    RectanglePrivate.prototype = {
        _init: function() {
            this.color = DEFAULT_COLOR.copy();
            this.border_color = DEFAULT_BORDER_COLOR.copy();
            this.border_width = 0;
            this.has_border = false;
        }
    };

    var DEFAULT_COLOR = new Color(255,255,255,255);
    var DEFAULT_BORDER_COLOR = new Color(0,0,0,255);

/**
 * SECTION:clutter-rectangle
 * @short_description: An actor that displays a simple rectangle.
 *
 * #ClutterRectangle is a #ClutterActor which draws a simple filled rectangle.
 *
 * Deprecated: 1.10: Use #ClutterActor instead.
 */
    var Rectangle = function(params) {
        this._init(params);
    };
    Rectangle.prototype = Object.create(Actor.prototype, {
        _init: {
            value: function(params) {
                Actor.prototype._init.call(this); // superclass init
                this[PRIVATE] = new RectanglePrivate();
                this.set_props(params);
            }
        },
        color: {
            get: function() { return this[PRIVATE].color; },
            set: function(color) {
                this[PRIVATE].color.set_from_color(color);

                this.queue_redraw();
                this.notify('color');
            }
        },
        border_width: {
            get: function() { return this[PRIVATE].border_width; },
            set: function(border_width) {
                this[PRIVATE].border_width = border_width;
                if (border_width !== 0) {
                    this[PRIVATE].has_border = true;
                } else {
                    this[PRIVATE].has_border = false;
                }

                this.queue_redraw();
                this.notify('border_width');
                this.notify('has_border');
            }
        },
        border_color: {
            get: function() { return this[PRIVATE].border_color; },
            set: function(border_color) {
                if (Color.equals(this[PRIVATE].border_color, border_color)) {
                    return;
                }
                this[PRIVATE].border_color.set_from_color(border_color);

                if (Color.equal(this.border_color, this.color)) {
                    this[PRIVATE].has_border = false;
                } else {
                    this[PRIVATE].has_border = true;
                }
                this.queue_redraw();
                this.notify('border_color');
                this.notify('has_border');
            }
        },
        has_overlaps: {
            value: function() {
                /* Rectangles never need an offscreen redirect because there are
                   never any overlapping primitives */
                return false;
            }
        },
        // XXX get_paint_volume redirects to
        //   return _clutter_actor_set_default_paint_volume (self,
        //                                          CLUTTER_TYPE_RECTANGLE,
        //                                          volume);

        // XXX paint()
    });
    return Rectangle;
});

define(["./actor", "./color", "./dom"], function(Actor, Color, Dom) {
    /** A 'Stage' is a top-level window on which child actors are placed
     *  and manipulated.  In jutter, a Stage corresponds to a WebGL canvas.
     */
    var _default_stage = null;
    var Stage = function(canvas) {
        if (!canvas) {
            if (!_default_stage) {
                _default_stage = this;
                canvas = Dom.initial_canvas;
            } else {
                canvas = Dom.new_canvas();
            }
        }
        this._canvas = canvas;
        this._color = Color.BLACK;
    };
    Stage.prototype = {
        acquire_pick_id: function(actor) {
        },
        _release_pick_id: function(pick_id) {
        },
        get key_focus() {
        },
        set key_focus(actor) {
        },
        get color() {
            return this._color;
        },
        set color(color) {
            this._color = color;
        },
        get title() {
            return Dom.get_title(this._canvas);
        },
        set title(new_title) {
            Dom.set_title(this._canvas, new_title);
        },
        show_all: function() {
        }
    };
    Stage.get_default = function() {
        if (!_default_stage) { new Stage(); }
        return _default_stage;
    };

    return Stage;
});

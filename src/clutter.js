define(["./dom", "./color"], function(Dom, Color) {

    var init = function(args) {
    };

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
    var main = function() {
    };

    return {
        init: init,
        Color: Color,
        Stage: Stage,
        main: main
    };
});

define(["./color", "./dom", "./group"], function(Color, Dom, Group) {
    /** A 'Stage' is a top-level window on which child actors are placed
     *  and manipulated.  In jutter, a Stage corresponds to a WebGL canvas.
     */
    var _default_stage = null;
    var Stage = function(canvas) {
        this._init(canvas);
    };
    Stage.prototype = Object.create(Group.prototype, {
        _init: {
            value: function(canvas) {
                Group.prototype._init.call(this); // superclass init
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
            }
        },
        acquire_pick_id: {
            value: function(actor) {
            }
        },
        _release_pick_id: {
            value: function(pick_id) {
            }
        },
        key_focus: {
            get: function() {
            },
            set: function(actor) {
            }
        },
        color: {
            get: function() { return this._color; },
            set: function() { this._color = color; }
        },
        title: {
            get: function() {
                return Dom.get_title(this._canvas);
            },
            set: function(new_title) {
                Dom.set_title(this._canvas, new_title);
            }
        }
    });
    Stage.get_default = function() {
        if (!_default_stage) { new Stage(); }
        return _default_stage;
    };

    return Stage;
});

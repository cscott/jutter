define(["./dom"], function(dom) {

    var init = function(args) {
    };

    /** A 'Stage' is a top-level window on which child actors are placed
     *  and manipulated.  In jutter, a Stage corresponds to a WebGL canvas.
     */
    var Stage = function(canvas) {
	if (!canvas) { canvas = dom.new_canvas(); }
	this._canvas = canvas;
    };
    Stage.prototype = {
	set_title: function(title) {
	},
	show_all: function() {
	}
    };
    var _default_stage = new Stage(dom.initial_canvas);
    Stage.get_default = function() {
	return _default_stage;
    };
    var main = function() {
    };

    return {
	init: init,
	Stage: Stage,
	main: main
    };
});

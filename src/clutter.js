define([], function() {

    var init = function(args) {
    };
    var Stage = function() {
    };
    Stage.prototype = {
	set_title: function(title) {
	},
	show_all: function() {
	}
    };
    var _default_stage = new Stage();
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

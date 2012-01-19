define([], function() {
    /** Export a limited set of functions for working with the DOM.
     *  These can be reimplemented for a standalone application.
     */

    var insertMeta = function(window) {
	window.document.head.innerHTML = ''+
	    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'+
	    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />'+
	    '<meta name="apple-mobile-web-app-capable" content="yes" />'+
	    '<meta name="apple-mobile-web-app-status-bar-style" content="black" />'+
	    '';
    };
    var setTitle = function(window, new_title) {
	window.document.title = new_title;
    };
    var insertCanvas = function(window) {
	var doc = window.document;
	var canvas = document.createElement("canvas");
	canvas.id="jutter";
	canvas.style.position="absolute";
	canvas.style.left="0px";
	canvas.style.top="0px";
	canvas.style.right="0px";
	canvas.style.bottom="0px";
	document.body.appendChild(canvas);
	var onWindowResize = function(event) {
	    var w = window.innerWidth, h = window.innerHeight;
	    // XXX force aspect ratio?
	    canvas.width = w;
	    canvas.height = h;
	    console.log("Resizing canvas", w, h);
	};
	window.addEventListener('resize', onWindowResize, false);
	onWindowResize();
	return canvas;
    };

    // Create initial stage.
    var init = function(window) {
	insertMeta(window);
	setTitle(window, "Jutter");
	return insertCanvas(window);
    };
    var new_window = function(parent_window) {
	var nw = parent_window.open("", "_blank");
	insertMeta(nw);
	setTitle(nw, "Jutter");
	return insertCanvas(nw);
    };

    return {
	initial_canvas: init(window),
	new_canvas: function() { return new_window(window); }
    };
});

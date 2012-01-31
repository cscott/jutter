/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./color", "./event", "./geometry", "./paint-volume", "./rectangle", "./stage", "./vertex"], function(Actor, Color, Event, Geometry, PaintVolume, Rectangle, Stage, Vertex) {

    var init = function(args) {
        console.log("In Clutter.init", args);
    };

    var main = function() {
        console.log("In Clutter.main");
    };

    return {
        Actor: Actor,
        Color: Color,
        Event: Event,
        Geometry: Geometry,
        PaintVolume: PaintVolume,
        Rectangle: Rectangle,
        Stage: Stage,
        Vertex: Vertex,

        init: init,
        main: main
    };
});

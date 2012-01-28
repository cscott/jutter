/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./color", "./event", "./geometry", "./paint-volume", "./stage", "./vertex"], function(Actor, Color, Event, Geometry, PaintVolume, Stage, Vertex) {

    var init = function(args) {
    };

    var main = function() {
    };

    return {
        Actor: Actor,
        Color: Color,
        Event: Event,
        Geometry: Geometry,
        PaintVolume: PaintVolume,
        Stage: Stage,
        Vertex: Vertex,

        init: init,
        main: main
    };
});

/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./color", "./enums", "./event", "./geometry", "./paint-volume", "./rectangle", "./stage", "./vertex"], function(Actor, Color, Enums, Event, Geometry, PaintVolume, Rectangle, Stage, Vertex) {

    var init = function(args) {
        console.log("In Clutter.init", args);
    };

    var main = function() {
        console.log("In Clutter.main");
    };

    var Clutter = {
        Actor: Actor,
        Color: Color,
        Event: Event,
        Geometry: Geometry,
        PaintVolume: PaintVolume,
        Rectangle: Rectangle,
        Stage: Stage,
        Vertex: Vertex
    };
    // transfer enumerations to the Clutter object.
    var key;
    for (key in Enums) {
        if (Enums.hasOwnProperty(key)) {
            Clutter[key] = Enums[key];
        }
    }
    // Static methods.
    Clutter.init = init;
    Clutter.main = main;
    //
    return Clutter;
});

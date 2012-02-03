/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./actor", "./actor-box", "./backend", "./color", "./context", "./enums", "./event", "./feature", "./geometry", "./layout-manager", "./main", "./margin", "./note", "./paint-volume", "./rectangle", "./signals", "./stage", "./vertex"], function(Actor, ActorBox, Backend, Color, Context, Enums, Event, Feature, Geometry, LayoutManager, Main, Margin, Note, PaintVolume, Rectangle, Signals, Stage, Vertex) {

    var main = function() {
        console.log("In Clutter.main");
    };

    var Clutter = {
        Actor: Actor,
        ActorBox: ActorBox,
        Backend: Backend,
        Color: Color,
        Context: Context,
        Event: Event,
        Feature: Feature,
        Geometry: Geometry,
        LayoutManager: LayoutManager,
        Margin: Margin,
        PaintVolume: PaintVolume,
        Rectangle: Rectangle,
        Signals: Signals,
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
    // some logging support transferred from Note
    Clutter.DebugFlag = Note.DebugFlag;
    Clutter.PickDebugFlag = Note.PickDebugFlag;
    Clutter.DrawDebugFlag = Note.DrawDebugFlag;
    Clutter.enable_debug = function(cat) { Note.enable_debug(cat); };
    Clutter.disable_debug = function(cat) { Note.disable_debug(cat); };
    // Static methods.
    Clutter.init = Main.init;
    Clutter.main = main;
    //
    return Clutter;
});

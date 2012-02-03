/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false, window:false */
'use strict';
define(["./backend"], function(Backend) {
    var BackendWebGL = function() {
        this._init();
    };
    BackendWebGL.prototype = Object.create(Backend.prototype);
    BackendWebGL.prototype._init = function() {
        Object.getPrototypeOf(BackendWebGL.prototype)._init.call(this);
    };
    BackendWebGL.prototype.events_webgl_init = function() {
        // XXX CSA XXX set up event handlers
    };

    return BackendWebGL;
});

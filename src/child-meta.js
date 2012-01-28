/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {

    var ChildMeta = function(container, actor) {
        this._init(container, actor);
    };
    ChildMeta.prototype = {
        _init: function(container, actor) {
            this.container = container;
            this.actor = actor;
        }
    };
    return ChildMeta;
});

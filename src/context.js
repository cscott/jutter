/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define([], function() {
    var Context = function() {
    };
    Context.prototype = {
    };
    Context.acquire_id = function(thing) {
        console.warn("acquire_id unimplemented");
        return 0;
    };
    return Context;
});

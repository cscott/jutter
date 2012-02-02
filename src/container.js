/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
'use strict';
define(["./child-meta"], function(ChildMeta) {
    var QUARK_CHILD_META = "_container_child_data";

    /* bits from ClutterContainer which are still needed */
    var create_child_meta = function(actor) {
        if (!this.child_meta_type) {
            return;
        }
        if (!(this.child_meta_type instanceof ChildMeta)) {
            console.warn("Child data is not a ChildMeta",
                         this, this.child_meta_type);
            return;
        }
        var child_meta = new (this.child_meta_type)(this, actor);
        actor[QUARK_CHILD_META] = child_meta;
    };
    var destroy_child_meta = function(actor) {
        if (!this.child_meta_type) {
            return;
        }
        delete actor[QUARK_CHILD_META];
    };
/**
 * clutter_container_get_child_meta:
 * @container: a #ClutterContainer
 * @actor: a #ClutterActor that is a child of @container.
 *
 * Retrieves the #ClutterChildMeta which contains the data about the
 * @container specific state for @actor.
 *
 * Return value: (transfer none): the #ClutterChildMeta for the @actor child
 *   of @container or %NULL if the specifiec actor does not exist or the
 *   container is not configured to provide #ClutterChildMeta<!-- -->s
 *
 * Since: 0.8
 */
    var get_child_meta = function(actor) {
        if (!this.child_meta_type) {
            return null;
        }
        // virtual method
        if (this.real_get_child_meta) {
            return this.real_get_child_meta(actor);
        }
        return null;
    };

    // virtual method.
    var real_get_child_meta = function(actor) {
        if (!this.child_meta_type) {
            return null;
        }
        var meta = actor[QUARK_CHILD_META];
        if (meta && meta.actor === actor) {
            return meta;
        }
        return null;
    };

    var addContainerProperties = function(proto) {
        proto.child_meta_type = null; // "INVALID"
        proto.create_child_meta = create_child_meta;
        proto.destroy_child_meta = destroy_child_meta;
        proto.get_child_meta = get_child_meta;
        proto.real_get_child_meta = real_get_child_meta;
    };

    return {
        addContainerProperties: addContainerProperties
    };
});

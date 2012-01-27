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

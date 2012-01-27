define(["./child-meta"], function(ChildMeta) {

    var LayoutMeta = function(manager, container, actor) {
        this._init(manager, container, actor);
    };
    LayoutMeta.prototype = Object.create(ChildMeta.prototype, {
        _init: {
            value: function(manager, container, actor) {
                ChildMeta.prototype._init.call(this, container, actor);
                this.manager = manager;
            }
        }
    });
    return LayoutMeta;
});

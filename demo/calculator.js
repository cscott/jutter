define(["../src/clutter"], function(Clutter) {

var Calculator = function(args) {
    Clutter.init(args);
    var stage = Clutter.Stage.get_default();
    stage.title = 'Calculator';

    stage.show_all();
    if (false) {
        /* not needed in jutter */
        Clutter.main();
        stage.destroy();
    }
};

var c = new Calculator([]);
return { Calculator: Calculator };
});

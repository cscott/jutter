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
    console.log(Clutter.Color.from_string("rgb(255,100%,33)"));
    console.log(Clutter.Color.from_string("rgba(255,100%,33, 50%)"));
    console.log(Clutter.Color.from_string("hsl(180,0.5,0.5)"));
};

var c = new Calculator([]);
return { Calculator: Calculator };
});

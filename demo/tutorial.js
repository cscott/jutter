/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true
 */
/*global define:false, console:false */
define(["../src/clutter"], function(Clutter) {
    /* From http://www.openismus.com/documents/clutter_tutorial/1.0/docs/tutorial/html/sec-actors.html */

    var Main = function(args) {
        Clutter.init(args);

        var stage_color = new Clutter.Color(0x00, 0x00, 0x00, 0xFF);
        var actor_color = new Clutter.Color(0xFF, 0xFF, 0xFF, 0x99);

        var stage = Clutter.Stage.get_default();
        stage.title = "Clutter Tutorial Demo";
        stage.size = { width: 200, height: 200 };
        stage.color = stage_color;

        /* Add a rectangle to the stage */
        var rect = new Clutter.Rectangle({
            color: actor_color,
            size: { width: 100, height: 100 },
            position: { x: 20, y: 20 }
        });
        stage.add_child(rect);
        rect.show();

        /* Add a label to the stage */
        // XXX NOT YET

        /* Show the stage: */
        stage.show();


        /* Start the main loop. */
        Clutter.main();
    };

    var main = new Main([]);

    // write to global context for easier debugging
    this.Main = main;
    this.Clutter = Clutter;

    return { Main: main };
});

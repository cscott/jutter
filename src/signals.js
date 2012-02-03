/*jshint
  eqeqeq:true, curly:true, latedef:true, newcap:true, undef:true,
  trailing:true, es5:true, globalstrict:true
 */
/*global define:false, console:false */
/*
 * Copyright (c) 2008  litl, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
'use strict';
define([], function() {

// A couple principals of this simple signal system:
// 1) should look just like our GObject signal binding
// 2) memory and safety matter more than speed of connect/disconnect/emit
// 3) the expectation is that a given object will have a very small number of
//    connections, but they may be to different signal names

function _connect(name, callback, run_last) {
    /*jshint validthis:true */

    // be paranoid about callback arg since we'd start to throw from emit()
    // if it was messed up
    if (typeof(callback) !== 'function') {
        throw new Error("When connecting signal must give a callback that is a function");
    }

    // we instantiate the "signal machinery" only on-demand if anything
    // gets connected.
    if (!('_signalConnections' in this)) {
        this._signalConnections = [];
        this._nextConnectionId = 1;
    }

    var id = this._nextConnectionId;
    this._nextConnectionId += 1;

    // this makes it O(n) in total connections to emit, but I think
    // it's right to optimize for low memory and reentrancy-safety
    // rather than speed
    this._signalConnections.push({ 'id' : id,
                                   'name' : name,
                                   'callback' : callback,
                                   'disconnected' : false,
                                   'run_last': run_last
                                 });
    return id;
}
function _connect_first(name, callback) {
    /*jshint validthis:true */
    return _connect.call(this, name, callback, true);
}
function _connect_last(name, callback) {
    /*jshint validthis:true */
    return _connect.call(this, name, callback, false);
}

function _disconnect(id) {
    /*jshint validthis:true */
    if ('_signalConnections' in this) {
        var i;
        var length = this._signalConnections.length;
        for (i = 0; i < length; ++i) {
            var connection = this._signalConnections[i];
            if (connection.id === id) {
                if (connection.disconnected) {
                    throw new Error("Signal handler id " + id + " already disconnected");
                }

                // set a flag to deal with removal during emission
                connection.disconnected = true;
                this._signalConnections.splice(i, 1);

                return;
            }
        }
    }
    throw new Error("No signal connection " + id + " found");
}

function _disconnectAll() {
    /*jshint validthis:true */
    if ('_signalConnections' in this) {
        while (this._signalConnections.length > 0) {
            _disconnect.call(this, this._signalConnections[0].id);
        }
    }
}

var RUN_FIRST=   1 << 0;
var RUN_LAST =   1 << 1;
var RUN_CLEANUP= 1 << 2;
var NO_RECURSE=  1 << 3;
var NO_HOOKS=    1 << 4;

function _emit(name /* , arg1, arg2 */) {
    /*jshint validthis:true */
    // may not be any signal handlers at all, if not then return
    var _signalConnections;
    if ('_signalConnections' in this) {
        _signalConnections = this._signalConnections;
    } else if (('_signalClosure-'+name) in this) {
        _signalConnections = [];
    } else {
        return false; // "not handled"
    }
    // strip off detail argument if present
    var basename = name;
    var b = basename.indexOf('::');
    if (b >= 0) {
        basename = basename.substr(0, b);
    }

    // To deal with re-entrancy (removal/addition while
    // emitting), we copy out a list of what was connected
    // at emission start; and just before invoking each
    // handler we check its disconnected flag.
    var handlers = [];
    var i, j;
    var length = _signalConnections.length;
    var connection;
    for (i = 0; i < length; ++i) {
        connection = _signalConnections[i];
        if (connection.name === name ||
            connection.name === basename) {
            handlers.push(connection);
        }
    }

    // create arg array which is emitter + everything passed in except
    // signal name. Would be more convenient not to pass emitter to
    // the callback, but trying to be 100% consistent with GObject
    // which does pass it in. Also if we pass in the emitter here,
    // people don't create closures with the emitter in them,
    // which would be a cycle.
    // XXX CSA mod: pass in emitter as 'this', not as explicit arg.

    var arg_array = [ ];
    // arguments[0] should be signal name so skip it
    length = arguments.length;
    for (i = 1; i < length; ++i) {
        arg_array.push(arguments[i]);
    }
    var cont = true;

    var closure = null;
    if (('_signalClosure-'+name) in this) {
        closure = this['_signalClosure-'+name];
    }
    var flags = 0;
    if (('_signalFlags-'+name) in this) {
        flags = this['_signalFlags-'+name];
    }

    if (cont && closure && (flags & RUN_FIRST)) {
        try {
            cont = !closure.apply(this, arg_array);
        } catch (e1) {
            console.error("Exception in class closure for signal: "+name, e1);
        }
    }

    length = handlers.length;
    for (j = 0; cont && j < 2; ++j) {
        for (i = 0; cont && i < length; ++i) {
            connection = handlers[i];
            if (connection.disconnected) {
                continue;
            }
            if ((j===0) !== (!connection.run_last)) {
                continue;
            }
            try {
                // if the callback returns true, we don't call the next
                // signal handlers
                cont = !connection.callback.apply(this, arg_array);

            } catch(e2) {
                // just log any exceptions so that callbacks can't disrupt
                // signal emission
                console.error("Exception in callback for signal: "+name, e2);
            }
        }
    }
    if (cont && closure && (flags & RUN_LAST)) {
        try {
            cont = !closure.apply(this, arg_array);
        } catch (e3) {
            console.error("Exception in class closure for signal: "+name, e3);
        }
    }

    if (closure && (flags & RUN_CLEANUP)) {
        try {
            cont = !closure.apply(this, arg_array);
        } catch (e4) {
            console.error("Exception in class closure for signal: "+name, e4);
        }
    }
    return !cont; // true means "handled"
}

function _notify(propname) {
    /*jshint validthis:true */
    if (this._notifications && this._notifications.frozen > 0) {
        if (this._notifications.props.indexOf(propname) === -1) {
            this._notifications.props.push(propname);
        }
        return;
    }
    this.emit('notify::'+propname, propname, this[propname]);
}
function _freeze_notify() {
    /*jshint validthis:true */
    if (!this._notifications) {
        this._notifications = { frozen: 0, props: [] };
    }
    this._notifications.frozen += 1;
}
function _thaw_notify() {
    /*jshint validthis:true */
    console.assert(this._notifications);
    this._notifications.frozen -= 1;
    if (this._notifications.frozen > 0) {
        return;
    }
    var props = this._notifications.props;
    delete this._notifications;

    var i;
    for (i=0; i<props.length; i++) {
        this.emit('notify', props[i], this[props[i]]);
    }
}

function addSignalMethods(proto) {
    proto.connect = _connect_first;
    proto.connect_after = _connect_last;
    proto.disconnect = _disconnect;
    proto.emit = _emit;
    proto.notify = _notify;
    proto.freeze_notify = _freeze_notify;
    proto.thaw_notify = _thaw_notify;
    // this one is not in GObject, but useful
    proto.disconnectAll = _disconnectAll;
}

function _make_wrapper(name) {
    if (typeof(name) !== 'string') { return name; }
    return function() {
        return (this[name]).apply(this, arguments);
    };
}

function register(proto, signals) {
    var props, key;
    for (key in signals) {
        if (signals.hasOwnProperty(key)) {
            props = signals[key];
            if ('flags' in props) {
                proto['_signalFlags-'+key] = props.flags;
            }
            if ('closure' in props) {
                proto['_signalClosure-'+key] = _make_wrapper(props.closure);
            }
        }
    }
}


    return {
        RUN_FIRST:   RUN_FIRST,
        RUN_LAST :   RUN_LAST,
        RUN_CLEANUP: RUN_CLEANUP,
        NO_RECURSE:  NO_RECURSE,
        NO_HOOKS:    NO_HOOKS,

        addSignalMethods: addSignalMethods,
        register: register
    };
});

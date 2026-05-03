/**
 * AeroForge — Timer Manager
 * Centralized timer tracking to prevent memory leaks from orphaned intervals/timeouts.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    var TimerManager = {
        _timers: {},
        setInterval: function(key, fn, ms) {
            this.clear(key);
            this._timers[key] = { id: window.setInterval(fn, ms), type: 'interval' };
        },
        setTimeout: function(key, fn, ms) {
            this.clear(key);
            var self = this;
            this._timers[key] = {
                id: window.setTimeout(function() {
                    fn();
                    delete self._timers[key];
                }, ms),
                type: 'timeout'
            };
        },
        clear: function(key) {
            var t = this._timers[key];
            if (t) {
                if (t.type === 'interval') window.clearInterval(t.id);
                else window.clearTimeout(t.id);
                delete this._timers[key];
            }
        },
        clearAll: function() {
            var keys = Object.keys(this._timers);
            for (var i = 0; i < keys.length; i++) {
                this.clear(keys[i]);
            }
        }
    };

    AF.TimerManager = TimerManager;

})(window.AeroForge);

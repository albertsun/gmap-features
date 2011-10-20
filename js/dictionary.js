/* Author: Albert Sun
   WSJ.com News Graphics
*/

/*jslint white: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false */
/*global jQuery: false, $: false, log: false, window: false */

// Necessary functions
if (!window.typeOf) {
    window.typeOf = function(b){var a=typeof b;if(a==="object")if(b){if(b instanceof Array)a="array"}else a="null";return a};
}

var WSJNG = WSJNG || {};

// an object with some handy extensions
WSJNG.Dictionary = function() {

};
WSJNG.Dictionary.prototype = {
    get length() {
        var count = 0;
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                count = count+1;
            }
        }
        return count;
    },
    keys: function() {
        var keys = [];
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                keys.push(prop);
            }
        }
        return keys;
    },
    values: function() {
        var values = [];
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                values.push(this[prop]);
            }
        }
        return values;
    },
    items: function() {
        var items = [];
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                items.push([prop, this[prop]]);
            }
        }
        return items;
    }
};
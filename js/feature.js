/* Author: Albert Sun
   WSJ.com News Graphics
*/

/*jslint white: false, nomen: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false, es5: true, maxerr: 200 */
/*global jQuery: false, $: false, log: false, window: false, WSJNG: false, _: false, google: false, localStorage: false */

// Necessary functions
if (!window.typeOf) {
    window.typeOf = function(b){var a=typeof b;if(a==="object")if(b){if(b instanceof Array)a="array"}else a="null";return a};
}

// ***************************************
// Just in case there's a console.log hanging around....
// ***************************************
if (!window.console) { window.console = { "log": jQuery.noop }; }

// ***************************************
// Set up a Global Namespace
// ***************************************
var WSJNG = WSJNG || {};


// extend the Google Maps LatLng object for convenience
google.maps.LatLng.prototype.toGeoJSON = function() { return [this.lng(), this.lat()]; };
google.maps.MVCArray.prototype.toGeoJSON = function() {
    var thisarray = this.getArray();
    var newarray = [];
    for (var i=0,len=thisarray.length; i<len; i++) {
        newarray.push(thisarray[i].toGeoJSON());
    }
    return newarray;
};



/**
 * A geometric feature that goes on the map.
 * Constructor takes one object params object as an argument.
 * Expects there to be the following fields.
 * @param {Object} params
 * @param {String} params.GEOID10 The unique identifier (GEOID10) of the feature
 * @param {Array} params.multipolygon A GeoJSON multipolygon like array with LatLng objects. [ [ [ {google.maps.LatLng}, ], ], ]
 * @param {Object} params.fields An object with keys and values of data to store with the feature.
 * @param {google.maps.Map} params.map A google maps object onto which to render the polygons of the feature.
 * @param {WSJNG.DrawingController} params.controller A controller object to control its selected or not state
 */
WSJNG.Feature = function(params) {
    var self = this;
    this.GEOID10 = params.GEOID10;
    this.polygons = [];
    if (params.fields) {
        this.fields = params.fields;
        this.humanized_fields = {};
        for (var prop in params.fields) {
            if (params.fields.hasOwnProperty(prop)) {
                this.humanized_fields[prop] = WSJNG.util.humanize.addCommas(params.fields[prop]);
            }
        }
    }
    this.controller = params.controller;
    this._selected = false;
    this._highlighted = false;
    function mouseoverHandler(e) {
        self.mouseover(e);
    }
    function mouseoutHandler(e) {
        self.highlighted = false;
    }
    for (var i=0,len=params.multipolygon.length; i<len; i++) {
        this.polygons.push( new google.maps.Polygon(_.extend({}, this._unselected_poly_options, {
            paths: params.multipolygon[i],
            map: params.map
        })) );
        google.maps.event.addListener(this.polygons[i], "mousemove", mouseoverHandler);
        google.maps.event.addListener(this.polygons[i], "mouseout", mouseoutHandler);
    }

    // stores which tiles this Feature is on
    this.tiles = new WSJNG.Dictionary();;
};
WSJNG.Feature.prototype = {
    _unselected_poly_options: {
        clickable: true,
        fillOpacity: 0.2,
        fillColor: "#EDF2FA",
        strokeColor: "#000000",
        strokeWeight: 0.5,
        strokeOpacity: 0.3
    },
    mouseover: function(e) {
        $("#blockinfo").html(this._infowindow_tmpl($.extend({"GEOID10": this.GEOID10}, this.humanized_fields)));
        this.highlighted = true;
        if (this.controller.drawmode === true) {
            this.select();
        } else if (this.controller.erasemode === true) {
            this.unselect();
        }
    },
    select: function() {
        if (this.selected !== true) { this.controller.num_unsaved_changes += 1; }
        this.selected = true;
    },
    unselect: function() {
        if (this.selected !== false) { this.controller.num_unsaved_changes += 1; }
        this.selected = false;
    },
    remove: function(e) {
        for (var i=0,len=this.polygons.length; i<len; i++) {
            google.maps.event.clearListeners(this.polygons[i], "mousemove");
            google.maps.event.clearListeners(this.polygons[i], "mouseout");
            this.polygons[i].setMap(null);
        }
        this.controller = null;
        this.polygons = null;
    },
    toGeoJSON: function() {
        var multipoly = [];
        for (var i=0,len=this.polygons.length; i<len; i++) {
            multipoly.push(this.polygons[i].getPaths().toGeoJSON());
        }
        return multipoly;
    },
    get selected() {
        return this._selected;
    },
    set selected(value) {
        var i, len;
        if (value === true) {
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions({
                    fillColor: "#00AE4D",
                    fillOpacity: 0.4
                });
            }
            this.controller.addToSelection(this);
            this._selected = true;
        } else if (value === false) {
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions(this._unselected_poly_options);
            }
            this.controller.removeFromSelection(this);
            this._selected = false;
        }
    },
    get highlighted() {
        return this._highlighted;
    },
    set highlighted(value) {
        var i,len;
        if ((value === true) && (this._highlighted === false)) {
            this._highlighted = true;
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions({
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    strokeColor: "#00AE4D"
                });
            }
        } else if ((value === false) && (this._highlighted === true)) {
            this._highlighted = false;
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions({
                    "strokeOpacity": this._unselected_poly_options["strokeOpacity"],
                    "strokeWeight": this._unselected_poly_options["strokeWeight"],
                    "strokeColor": this._unselected_poly_options["strokeColor"]
                });
            }
        }
    }
};
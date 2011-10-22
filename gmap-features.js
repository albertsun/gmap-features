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
var gmap = gmap || {};


// Don't want to introduce an underscore dependency just for one function, _.extend
// https://github.com/documentcloud/underscore/
var _ = _ || (function() {
    var _ = {};
    var slice = Array.prototype.slice,
    nativeForEach = Array.prototype.forEach;

    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles objects with the built-in `forEach`, arrays, and raw objects.
    // Delegates to **ECMAScript 5**'s native `forEach` if available.

    var each = _.each = _.forEach = function(obj, iterator, context) {
	if (obj == null) return;
	if (nativeForEach && obj.forEach === nativeForEach) {
	    obj.forEach(iterator, context);
	} else if (obj.length === +obj.length) {
	    for (var i = 0, l = obj.length; i < l; i++) {
		if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
	    }
	} else {
	    for (var key in obj) {
		if (hasOwnProperty.call(obj, key)) {
		    if (iterator.call(context, obj[key], key, obj) === breaker) return;
		}
	    }
	}
    };
    // Extend a given object with all the properties in passed-in object(s).
    _.extend = function(obj) {
	each(slice.call(arguments, 1), function(source) {
	    for (var prop in source) {
		if (source[prop] !== void 0) obj[prop] = source[prop];
	    }
	});
	return obj;
    };
    return _;
}());

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
 * @param {String} params.id The unique identifier of the feature
 * @param {Array} params.multipolygon A GeoJSON multipolygon like array with LatLng objects. [ [ [ {google.maps.LatLng}, ], ], ]
 * @param {Object} params.fields An object with keys and values of data to store with the feature.
 * @param {google.maps.Map} params.map A google maps object onto which to render the polygons of the feature.
 * @param {Object} params.controller A controller object to control its selected or not state
 */
gmap.Feature = function(params) {
    var self = this;
    this.id = params.id;
    this.polygons = [];
    if (params.fields) {
        this.fields = params.fields;
        // this.humanized_fields = {};
        // for (var prop in params.fields) {
        //     if (params.fields.hasOwnProperty(prop)) {
        //         this.humanized_fields[prop] = gmap.util.humanize.addCommas(params.fields[prop]);
        //     }
        // }
    }
    this.controller = params.controller;
    this._selected = false;
    this._highlighted = false;
    if (params.highlight_callback) {
	this.highlight_callback = params.highlight_callback;
    }
    if (params.select_callback) {
	this.select_callback = params.select_callback;
    }
    function mouseoverHandler(e) {
        self.setHighlighted(true);
    }
    function mouseoutHandler(e) {
        self.setHighlighted(false);
    }
    function clickHandler(e) {
	if (self.getSelected()) {
	    self.setSelected(false);
	} else {
	    self.setSelected(true);
	}
    }
    for (var i=0,len=params.multipolygon.length; i<len; i++) {
        this.polygons.push( new google.maps.Polygon(_.extend({}, this._unselected_poly_options, {
            paths: params.multipolygon[i],
            map: params.map
        })) );
        google.maps.event.addListener(this.polygons[i], "mousemove", mouseoverHandler);
        google.maps.event.addListener(this.polygons[i], "mouseout", mouseoutHandler);
        google.maps.event.addListener(this.polygons[i], "click", clickHandler);
    }
};
gmap.Feature.prototype = {
    _unselected_poly_options: {
        clickable: true,
        fillOpacity: 0.25,
        fillColor: "#AAAAAA",
        strokeColor: "#000000",
        strokeWeight: 1.0,
        strokeOpacity: 0.25
    },
    _selected_poly_options: {
        fillColor: "#FF0000",
        fillOpacity: 0.5,
        strokeOpacity: 1.0,
	strokeWeight: 2.0,
        strokeColor: "#FF0000"
    },
    _highlighted_poly_options: {
        strokeOpacity: 1.0,
        strokeWeight: 2.0,
        strokeColor: "#00FF00"
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
    getSelected: function() {
        return this._selected;
    },
    setSelected: function(value) {
        var i, len;
        if (value === true) {
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions(this._selected_poly_options);
            }
	    if (this.controller.selected !== null) { this.controller.selected.setSelected(false); }
            this._selected = true;
	    this.controller.selected = this;
	    if (this.select_callback) { this.select_callback(); }
        } else if (value === false) {
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions(this._unselected_poly_options);
            }
            this._selected = false;
        }
    },
    getHighlighted: function() {
        return this._highlighted;
    },
    setHighlighted: function(value) {
        var i,len;
        if ((value === true) && (this._highlighted === false)) {
            this._highlighted = true;
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions(this._highlighted_poly_options);
            }
	    if (this.highlight_callback) { this.highlight_callback(); }
        } else if ((value === false) && (this._highlighted === true)) {
            this._highlighted = false;
	    var opts;
	    if (this.getSelected()) {
		opts = _.extend({}, this._unselected_poly_options, this._selected_poly_options);
	    } else {
		opts = _.extend({}, opts, this._unselected_poly_options);
	    }
            for (i=0,len=this.polygons.length; i<len; i++) {
                this.polygons[i].setOptions(opts);
            }
        }
    }
};/* Author: Albert Sun
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
var gmap = gmap || {};
gmap.geom = gmap.geom || {}; // namespace for utility functions that handle geometry


gmap.geom.ParseGeoJSONMultiPolygon = function(coordinates) {
    var i,len1,j,len2,k,len3;
    var multipoly = [],poly,linestring;
    for (i=0,len1=coordinates.length; i<len1; i++) { //loop through polygons
        poly = [];
        for (j=0,len2=coordinates[i].length; j<len2; j++) { //loop through linestrings
            linestring = [];
            for (k=0,len3=coordinates[i][j].length; k<len3; k++) { //loop through points
                linestring.push(new google.maps.LatLng(coordinates[i][j][k][1],coordinates[i][j][k][0]));
            }
            poly.push(linestring);
        }
        multipoly.push(poly);
    }
    return multipoly;
};
gmap.geom.ParseGeoJSONPolygon = function(coordinates) {
    var j,len2,k,len3;
    var poly=[],linestring;
    for (j=0,len2=coordinates.length; j<len2; j++) { //loop through linestrings
        linestring = [];
        for (k=0,len3=coordinates[j].length; k<len3; k++) { //loop through points
            linestring.push(new google.maps.LatLng(coordinates[j][k][1],coordinates[j][k][0]));
        }
        poly.push(linestring);
    }
    return poly;
};
/*jslint white: false, nomen: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false, es5: true, maxerr: 200 */
/*global jQuery: false, $: false, log: false, window: false, WSJNG: false, _: false, google: false, localStorage: false */

var gmap = gmap || {};

gmap.load_polygons = function(params) {
    var self = {},
    data = params.data,
    controller = {"selected": null};
    
    
    if (params.unselected_opts) {
	_.extend(gmap.Feature.prototype._unselected_poly_options, params.unselected_opts);
    }
    if (params.highlighted_opts) {
	_.extend(gmap.Feature.prototype._highlighted_poly_options, params.highlighted_opts);
    }
    if (params.selected_opts) {
	_.extend(gmap.Feature.prototype._selected_poly_options, params.selected_opts);
    }

    var geom, opts;
    for (var i=0,len=data.length; i<len; i++) {
	if (data[i].geom.type == "Polygon") {
            geom = [gmap.geom.ParseGeoJSONPolygon(data[i].geom.coordinates)];
        } else {
            geom = gmap.geom.ParseGeoJSONMultiPolygon(data[i].geom.coordinates);
        }
	opts = {
	    "id": data[i].id,
	    "multipolygon": geom,
	    "fields": data[i].fields,
	    "controller": controller,
	    "map": params.map
	};
	if (params.highlight_callback) {
	    opts.highlight_callback = params.highlight_callback;
	}
	if (params.select_callback) {
	    opts.select_callback = params.select_callback;
	}
	self[data[i].id] = new gmap.Feature(opts);
    }

    return self;
};
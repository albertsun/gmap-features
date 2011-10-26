
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
        if (params.getColor) {
            opts.color = params.getColor(data[i].fields);
        }
	if (params.highlightCallback) {
	    opts.highlightCallback = params.highlightCallback;
	}
	if (params.selectCallback) {
	    opts.selectCallback = params.selectCallback;
	}
	self[data[i].id] = new gmap.Feature(opts);
    }

    return self;
};
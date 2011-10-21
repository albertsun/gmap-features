
/*jslint white: false, nomen: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false, es5: true, maxerr: 200 */
/*global jQuery: false, $: false, log: false, window: false, WSJNG: false, _: false, google: false, localStorage: false */

var gmap = gmap || {};

gmap.load_polygons = function(params) {
    var self = {},
    data = params.data;
    
    if (params.unselected_opts) {
	_.extend(gmap.Feature.prototype._unselected_poly_options, params.unselected_opts);
    }

    for (var i=0,len=data.length; i<len; i++) {
	var geom;
	if (data[i].geom.type == "Polygon") {
            geom = [gmap.geom.ParseGeoJSONPolygon(data[i].geom.coordinates)];
        } else {
            geom = gmap.geom.ParseGeoJSONMultiPolygon(data[i].geom.coordinates);
        }
	self[data[i].id] = new gmap.Feature({
	    "id": data[i].id,
	    "multipolygon": geom,
	    "fields": data[i].fields,
	    "map": params.map
	});
    }

    return self;
};
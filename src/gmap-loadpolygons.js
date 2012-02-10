
/*jslint white: false, nomen: false, debug: false, devel: true, onevar: false, plusplus: false, browser: true, bitwise: false, es5: true, maxerr: 200 */
/*global jQuery: false, $: false, log: false, window: false, WSJNG: false, _: false, google: false, localStorage: false */

var gmap = gmap || {};

(function() {

    function parseKML(kmlstring) {
        var doc = $(kmlstring);
        var features = $.map(doc.find("Placemark"), function(placemark, i) {
            var obj = {};
            $placemark = $(placemark);
            obj.geometry = $placemark.find("MultiGeometry")[0];
            obj.id = $placemark.find("name").text();
            obj.properties = {};
            var datapoints = $placemark.find("ExtendedData Data"), $datapoint, val;
            for (var j=0,len=datapoints.length; j<len; j++) {
                $datapoint = $(datapoints[j]),
                val = $datapoint.find("value").text();
                if (!isNaN(parseFloat(val))) { val = Number(val); }
                obj.properties[$datapoint.attr("name")] = val;
            }
            return obj;
        });
        return features;
    }

    /*
     * Takes some params and builds a whole bunch of polygons.
     * OR, if passed an optional second argument, a dictionary of features, update those features with new options. 
     */
    gmap.load_polygons = function(params, features) {
        var self = {},
        data = params.data,
        controller = {"selected": null};

        var buildOpts = function(params) {
            var opts = {
                "map": params.map
            };
            gmap._.extend(opts, params);
            return opts;
        };


        if (typeOf(features) === "object") {
          self = features;
          for (var prop in features) {
            if (features.hasOwnProperty(prop)) {
              var opts = buildOpts(params);
              if (params.getColor) {
                  opts.color = params.getColor(features[prop].fields);
              }
              features[prop].updateOptions(opts); 
              features[prop].redraw();
            }
          }
        } else {
          if (params.data_type == "kml") {
              data = parseKML(data);
              //console.log(data);
          } else {
              data = data.features;
          }
          var geom, opts;
          for (var i=0,len=data.length; i<len; i++) {
              if (typeOf(data[i].geometry.coordinates) !== "array") {
                  // data is a KML node
                  geom = gmap.geom.ParseKMLMultiPolygon(data[i].geometry);
              } else {
                  // data is a geom object
                  if (data[i].geometry.type == "Polygon") {
                      geom = [ gmap.geom.ParseGeoJSONPolygon(data[i].geometry.coordinates) ];
                  } else {
                      geom = gmap.geom.ParseGeoJSONMultiPolygon(data[i].geometry.coordinates);
                  }
              }

              opts = buildOpts(params);
              opts.multipolygon = geom;
              opts.controller = controller;
              if (params.getColor) {
                  opts.color = params.getColor(data[i].properties);
              }
              opts.id = data[i].id;
              opts.fields = data[i].properties;

              self[data[i].id] = new gmap.Feature(opts);
          }
        }

        return self;
    };

    /**
     * Pass this the a dictionary as returned by load_polygons and it'll remove them from the map.
     */
    gmap.remove_polygons = function(features) {
        for (var prop in features) {
            if (features.hasOwnProperty(prop)) {
                features[prop].remove();
                delete features[prop];
            }
        }
        return features;
    };

}());

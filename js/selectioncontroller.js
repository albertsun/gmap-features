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


/**
 * Keeps track of currently selected WSJNG.Feature objects
 * This is a set of objects nested three deep, counties->tracts->blocks
 * At each level, we store the GEOID10 of the Feature and then either the WSJNG.Feature itself, or an object.
 * If the Feature itself is stored, that entire Feature is selected.
 * For County or Tract features, it may be the case that part of but not all of the feature is selected.
 * In that case we store an object with the partial ids of the selected tract or block.
 * @param {Object} params
 * @param {Number} params.id Server assigned id for this DrawnArea
 * @param {String} params.name
 * @param {String} params.description
 * @param {google.maps.Map} params.map A google maps object onto which to render the polygons of the feature.
 * @param {WSJNG.DrawingController} params.controller A controller object to control its selected or not state
 */
WSJNG.SelectionController = function(params) {
    this._selected = new WSJNG.Dictionary();
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.map = params.map;
    this.controller = params.controller;
};
WSJNG.SelectionController.loadFromLocalStorage = function(params) {
    var self = new WSJNG.SelectionController(params);
    var reloaded = self.deserialize(localStorage['WSJNG.redistricting']);
    self._selected = reloaded.selection;
    // no id set yet
    self.name = reloaded.name;
    self.description = reloaded.description;
    self.map.setCenter(new google.maps.LatLng(reloaded.center_lat, reloaded.center_lon));
    self.map.setZoom(reloaded.zoom);
    self.update();
    return self;
};
WSJNG.SelectionController.loadFromServer = function(params) {
    var self = new WSJNG.SelectionController(params);
    $.when($.getJSON("/districts/DrawnArea/"+params.id)).then(function(data) {
        self._selected = self.load(data.selectioncontroller);
        self.id = data.id;
        self.name = data.name;
        self.description = data.description;
        self.created = data.created;
        self.modified = data.modified;
        self.map.setCenter(new google.maps.LatLng(data.center_lat, data.center_lon));
        self.map.setZoom(data.zoom);
        self.controller.recolorMap();
        self.update();
    });
    return self;
};
WSJNG.SelectionController.prototype = {
    /**
     * Update the sidebar view with the newly updated data profile.
     */
    update: function() {
        var profile = this.getProfile();
        var len = this.length;
        var sb = $("#sidebar");
        sb.find("#display_numselected .value").text(WSJNG.util.humanize.addCommas(len));
        if (profile.incomplete) {
            sb.find("#display_totpop .value").text(WSJNG.util.humanize.addCommas(profile.fields.totpop)+"(incomplete count)");
        } else {
            sb.find("#display_totpop .value").text(WSJNG.util.humanize.addCommas(profile.fields.totpop));
        }
        WSJNG.charts.race_pie.series[0].setData([
            ['White',   profile.fields.totpop_wnh],
            ['Black',   profile.fields.totpop_black],
            ['Asian',   profile.fields.totpop_a],
            ['Hispanic',   profile.fields.totpop_h],
            ['Hawaiian/Pacific Islander',   profile.fields.totpop_hi],
            ['Native American',   profile.fields.totpop_na],
            ['Other',   profile.fields.totpop_other],
            ['Multiracial',   profile.fields.totpop_multiracial]
        ]);
        $("#drawnarea_header .name").text(this.name);
        $("#drawnarea_header .description").text(this.description);
    },

    /*
     * Add a new WSJNG.Feature to the controller.
     * If the GEOID10 has 15 digits, it's a block.
     * If it has 11 digits, it's a tract.
     * If it has 5 digits it's a county.
     */
    addFeature: function(f) {

        /**
          ************ TODO ************
          Need to implement some way of checking whether the object holding tracts or blocks has ALL the tracts or blocks.
          And if so, need to then convert it into the proper object.
          **/
        

        var type = f.GEOID10.length;
        var county = f.GEOID10.slice(0,5);

        if (type === 5) {
            /* If the Feature is a County */
            this._selected[county] = f;
        } else if (type === 11) {
            /* If the Feature is a Tract */
            var tract = f.GEOID10.slice(5,11);
            if (this._selected[county]) {
                if (this._selected[county].GEOID10) {
                    return; // the whole county is already selected, so do nothing
                } else {
                    // otherwise, it's an object holding tracts, so add this one
                    this._selected[county][tract] = f;
                }
            } else {
                // no object exists, so create one and add this tract
                this._selected[county] = new WSJNG.Dictionary();
                this._selected[county][tract] = f;
            }
        } else if (type === 15) {
            /* If the Feature is a Block */
            var tract = f.GEOID10.slice(5,11);
            var block = f.GEOID10.slice(11,15);
            if (this._selected[county]) {
                if (this._selected[county].GEOID10) {                    
                    return; // the whole county is already selected, so do nothing
                }
            } else {
                // no object exists, so create one
                this._selected[county] = new WSJNG.Dictionary();
            }
            if (this._selected[county][tract]) {
                if (this._selected[county][tract].GEOID10) {
                    return; // the whole tract is already selected, so do nothing
                } else {
                    // otherwise, it's an object holding blocks, so add this one
                    this._selected[county][tract][block] = f;
                }
            } else {
                // if no other block from this tract has been added yet, create an object for it and add a block
                this._selected[county][tract] = new WSJNG.Dictionary();
                this._selected[county][tract][block] = f;
            }
        }
        //this.update();
    },

    /*
     * Remove a WSJNG.Feature from the controller and return it.
     * If it is a County or Tract, remove the whole thing and return it
     * regardless of whether what was selected was actually a whole feature
     * or just a collection of smaller features.
     * If it wasn't selected, return undefined.
     */
    removeFeature: function(f) {
        var retval = this._removeFeature(f);
        //this.update();
        return retval;
    },
    _removeFeature: function(f) {

        /**
          ************ TODO ************
          Need to implement some way of checking whether the object holding tracts or blocks is newly empty,
          and if so to remove itself.
          **/


        var retval;
        var type = f.GEOID10.length;
        var county = f.GEOID10.slice(0,5);
        if (this._selected[county]) { retval = this._selected[county]; } else { return; }
        if (type === 5) {
            delete this._selected[county];
            return retval;
        }
        var tract = f.GEOID10.slice(5,11);
        if (retval[tract]) { retval = retval[tract]; } else { return; }
        if (type === 11) {
            delete this._selected[county][tract];
            return retval;
        }
        var block = f.GEOID10.slice(11,15);
        if (retval[block]) { retval = retval[block]; } else { return; }
        if (type === 15) {
            delete this._selected[county][tract][block];
            return retval;
        }
    },

    /**
     * Get a WSJNG.Feature, or Dictionary of features, specified by the given GEOID10, or return undefined if it's unselected.
     */
    getFeature: function(GEOID10) {
        var type = GEOID10.length;
        var county = GEOID10.slice(0,5);
        if (type === 5) {
            return this._selected[county];
        }
        var tract = GEOID10.slice(5,11);
        if (type === 11) {
            return this._selected[county][tract];
        }
        var block = GEOID10.slice(11,15);
        if (type === 15) {
            return this._selected[county][tract][block];
        }
    },
    
    /**
     * Returns true if it contains the feature specified by the given GEOID10 and false otherwise
     */
    containsFeature: function(GEOID10) {
        var type = GEOID10.length, curr, county = GEOID10.slice(0,5), tract, block;
        if (this._selected[county]) {
            curr = this._selected[county];
        } else {
            return false;
        }
        if (type === 5) {
            if (curr.GEOID10 === GEOID10) { return true; }
            else { return false; }
        }
        tract = GEOID10.slice(5,11);
        if (curr[tract]) {
            curr = curr[tract];
        } else {
            return false;
        }
        if (type === 11) {
            if (curr.GEOID10 === GEOID10) { return true; }
            else { return false; }
        }
        block = GEOID10.slice(11,15);
        if (curr[block]) {
            curr = curr[block];
        } else {
            return false;
        }
        if (type === 15) {
            if (curr.GEOID10 === GEOID10) { return true; }
            else { return false; }
        }
    },

    /**
     * Return a demographic profile of the selected features.
     */
    getProfile: function() {
        var self = this;

        var incomplete = false;
        function reduce_iterator(memo, o) {
            if (o.GEOID10) {
                if (o.placeholder) {
                    incomplete = true;
                    return memo;
                } else {
                    for (var prop in o.fields) {
                        if (o.fields.hasOwnProperty(prop)) {
                            if (memo.hasOwnProperty(prop)) {
                                memo[prop] += o.fields[prop];
                            } else {
                                memo[prop] = o.fields[prop];
                            }
                        }
                    }
                    return memo;
                    //return memo + o.fields.totpop
                }
            } else {
                return _.reduce(o.values(), reduce_iterator, memo);
            }
        }
        var fields = _.reduce(self._selected.values(), reduce_iterator, {});
        return {
            "incomplete": incomplete,
            "fields": fields
        };
    },

    /**
     * Return self in a JSON formatted string suitable for saving in localStorage or for POSTing to the server
     *
     */
    serialize: function() {
        function _serialize(o) {
            var new_o = {}, temp;
            for (var prop in o) {
                if (o.hasOwnProperty(prop)) {
                    if (o[prop].GEOID10) {
                        new_o[prop] = true;
                    } else {
                        temp = _serialize(o[prop]);
                        if (!_.isEmpty(temp)) {
                            new_o[prop] = temp;
                        }
                    }
                }
            }
            return new_o;
        }
        var center = this.map.getCenter();
        return JSON.stringify({ "selection":_serialize(this._selected), "name": this.name, "description": this.description, "center_lat": center.lat(), "center_lon": center.lng(), "zoom": this.map.getZoom() });
    },

    /**
     * Takes a JSON string as serialized by the serialize method above and builds out the contents of the SelecionController
     * Looks in WSJNG.Blocks to find the Feature objects. Or, if not found load it from the server (and wait for it).
     */
    deserialize: function(jsonstring) {
        var o = JSON.parse(jsonstring);
        return { "selection": this.load(o.selection), "name": o.name, "description": o.description, "center_lat": o.center_lat, "center_lon": o.center_lon, "zoom": o.zoom };
    },
    load: function(jsonobj) {
        function _load(o, prefix) {
            var new_o = new WSJNG.Dictionary(), temp;
            for (var prop in o) {
                if (o.hasOwnProperty(prop)) {
                    if (o[prop] === true) {
                        // assign to new_o[prop] the WSJNG.Feature object
                        if (WSJNG.Blocks[prefix+prop]) {
                            new_o[prop] = WSJNG.Blocks[prefix+prop];
                        } else {
                            new_o[prop] = {"placeholder":true, "GEOID10": prefix+prop};
                        }
                    } else if (!_.isEmpty(o[prop])) {
                        new_o[prop] = _load(o[prop], prefix+prop);
                    }
                }
            }
            return new_o;
        }
        return _load(jsonobj, "");
    },

    saveToLocalStorage: function() {
        localStorage['WSJNG.redistricting'] = this.serialize();
    },
    saveToServer: function() {
        var num_unsaved_changes;
        var self = this;

        function prep_for_post(s) {
            var data = JSON.parse(s);
            data.selection = JSON.stringify(data.selection);
            return data;
        }
        function failurehandler(responseObject, statusText, failureType) {
            console.log('save failed');
            var resp = JSON.parse(responseObject.responseText);
            console.log(resp.error);
            alert("Save failed: "+resp.error);
            this.controller.num_unsaved_changes = num_unsaved_changes;
        }

        var updatepromise;
        if (this.id !== undefined) {
            /**
             * TODO: figure out how to send only the changed data
             */
            updatepromise = this.updateToServer(prep_for_post(this.serialize()));
        } else {
            updatepromise = this.saveNewToServer(prep_for_post(this.serialize()));
        }
        num_unsaved_changes = this.controller.num_unsaved_changes;
        $.when(updatepromise).then(this.controller.updateLastUpdated, failurehandler);
        $.when(updatepromise).then(function() { self.controller.num_unsaved_changes = 0; });
    },
    saveNewToServer: function(data) {
        var self = this;
        console.log("saving new...");
        if (this.name === "Untitled") {
            alert('Please name your map something other than "Untitled"');
        } else {
            return $.post('/districts/DrawnArea', data, function(data) {
                console.log("Success: saved "+data.DrawnArea);
                self.id = data.DrawnArea;
                /*
                 * Upon saving to the server, should redirect (or pushState) to /draw/<id>
                 */
                history.pushState({}, "Drawing "+data.DrawnArea, "/draw/"+data.DrawnArea);
                $(".interface_saved_obj").show()
                $(".interface_unsaved_obj").hide();
                window.drawnarea_id = data.DrawnArea;
                // createCookie = function(name,value,days) {
                createCookie("wsjcmm_p"+data.DrawnArea,data.password,1);
                $("#savebutton").attr("value","Save");
                $("#exportlink").attr("href", "/districts/DrawnArea/"+data.DrawnArea+".kml");
            }, "json");
        }
    },
    updateToServer: function(data) {
        if (!this.id) { throw new Error("Trying to update a model that hasn't been saved yet"); }
        var self = this;
        console.log("updating "+this.id+"...");
        return $.ajax({
            "type": "PUT",
            "url": "/districts/DrawnArea/"+this.id,
            "data": JSON.stringify(data),
            "success": function(data) {
                console.log("Success: updated "+data.DrawnArea+" at "+data.modified);
                self.modified = data.modified
            },
            "dataType": "json"
        });
    },
    deleteOnServer: function(data) {
        if (!this.id) { throw new Error("Trying to update a model that hasn't been saved yet"); }
        var self = this;
        console.log("updating "+this.id+"...");
        return $.ajax({
            "type": "DELETE",
            "url": "/districts/DrawnArea/"+this.id,
            "success": function(data) {
                console.log("Success: deleted "+this.id);
                window.location = "/";
            },
            "dataType": "json"
        });
    },
    cloneOnServer: function() {
        if (!this.id) { throw new Error("Trying to clone a model that hasn't been saved yet"); }
        $.ajax({
            "type": "POST",
            "url": "/districts/copy/DrawnArea/"+this.id,
            "data": "{}",
            "success": function(data) {
                console.log("Success: cloned to "+data.DrawnArea+" at "+data.created);

                // redirect page to /draw/data.DrawnArea
                window.location = "/draw/"+data.DrawnArea;
            },
            "error": function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
                if (errorThrown === "FORBIDDEN") {
                    alert(JSON.parse(jqXHR.responseText).error);
                }
            },
            "dataType": "json"
        });
    },

    get length() {
        function reduce_iterator(memo, o) {
            if (o.GEOID10) {
                return memo + 1;
            } else {
                return _.reduce(o.values(), reduce_iterator, memo);
            }
        }
        return _.reduce(this._selected.values(), reduce_iterator, 0);
    },
    set length(value) {
        throw new Error("Can't directly set length property");
    }
};


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
// Cookie handling
// from http://www.quirksmode.org/js/cookies.html
// ***************************************
if (!window.createCookie) {
    window.createCookie = function(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else var expires = "";
        document.cookie = name+"="+value+expires+"; path=/";
    }
}
if (!window.readCookie) {
    window.readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
}
if (!window.eraseCookie) {
    window.eraseCookie = function(name) {
        createCookie(name,"",-1);
    }
}

// ***************************************
// Set up a Global Namespace
// ***************************************
var WSJNG = WSJNG || {};


WSJNG.ViewingController = (function() {
    var self = {};
    
    self.init = function(selectioncontroller) {
        this.SelectionController = selectioncontroller;
    };
    
    self.update = function() {
        this.SelectionController.update();
    };
    
    self.addToSelection = function(f) {
        this.SelectionController.addFeature(f);
        this.SelectionController.update();
    };
    self.removeFromSelection = function(f) {
        this.SelectionController.removeFeature(f);
        this.SelectionController.update();
    };

    /**
     * Loop through all blocks on map and recolor them based on whether or not they're selected
     */
    self.recolorMap = function() {
        var blocks = WSJNG.Blocks.values();
        for (var i=0,len=blocks.length; i<len; i++) {
            if (self.SelectionController.containsFeature(blocks[i].GEOID10) === true) {
                blocks[i].selected = true;
            } else {
                blocks[i].selected = false;
            }
        }
        self.update();
    };

    return self;
}());

// this will be a dictionary of 15 character GEOID10's to all Feature objects drawn on the map
WSJNG.Blocks = new WSJNG.Dictionary();


$(document).ready(function() {
    console.log("document load");

    WSJNG.map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(43.1073, -86.6833),
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false
    });

    (function() {
        var tbi = $("#toggleblockinfo");
        var bi = $("#blockinfo");
        tbi.toggle(function(e) {
            e.preventDefault();
            bi.show();
            tbi.text("Hide Block Info");
        }, function(e) {
            e.preventDefault();
            bi.hide();
            tbi.text("Show Block Info");
        });
    }());

    /**
     * Bind the clone button
     */
    $("#clonebutton").bind("click", function(e) {
        e.preventDefault();
        WSJNG.ViewingController.SelectionController.cloneOnServer();
    });

    /**
     * Bind action to happen before starting a new drawing. By creating a new empty SelectionController, installing it,
     * and saving to localStorage, when we get to /draw/ the selection will be empty.
     */
    $("#startnew").bind("click", function(e) {
        WSJNG.ViewingController.SelectionController.controller = null;
        WSJNG.ViewingController.init(new WSJNG.SelectionController({"name": "Untitled", "description": "Enter description here...", "map": WSJNG.map, "controller": WSJNG.ViewingController}));
        WSJNG.ViewingController.SelectionController.saveToLocalStorage();
    });
    /**
     * Bind action to happen before starting anew. By purging localStorage and unbinding the unload event
     * that would save anything to localStorage we get a completely fresh start on /draw/
     */
    $("#startnew_zoomedout").bind("click", function(e) {
        delete localStorage['WSJNG.redistricting'];
        $(window).unbind("unload");
    });
  
    WSJNG.ViewingController.init(WSJNG.SelectionController.loadFromServer({"id": window.drawnarea_id, "map": WSJNG.map, "controller": WSJNG.ViewingController}));

    var gmaphelper = new WSJNG.GmapHelper(WSJNG.map, WSJNG.ViewingController);
});

#!/bin/bash

cat src/*.js > gmap-features.js 2>/dev/null
java -jar $CLOSURE_PATH --js gmap-features.js > gmap-features.min.js

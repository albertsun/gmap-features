#!/bin/bash

cat src/*.js > gmap-features.js 2>/dev/null
java -jar /Users/albert/Utilities/closure-compiler/compiler.jar --js gmap-features.js > gmap-features.min.js

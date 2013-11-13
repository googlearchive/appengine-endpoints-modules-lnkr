#!/bin/bash

~/tools/appengine/google_appengine/endpointscfg.py get_client_lib java -o . -f rest api.ShortLinkApi

sass styles/main.scss > styles/main.css

/usr/local/google/home/dacton/tools/closure-library/closure/bin/build/closurebuilder.py \
--root=/usr/local/google/home/dacton/tools/closure-library \
--root=/usr/local/google/home/dacton/Desktop/Work/lnkr.co.za/js/ \
--namespace=lnkr --namespace=lnkr.data --output_mode=compiled \
--compiler_jar=../../../../closure-compiler/compiler.jar > \
~/Desktop/Work/lnkr.co.za/js/lnkr-compiled.js

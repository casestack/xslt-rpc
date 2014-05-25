#!/bin/bash

FILE_LOCATION="./bin/xslt-gui.nw"

rm $FILE_LOCATION

zip -r0 $FILE_LOCATION * && open $FILE_LOCATION
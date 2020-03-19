#!/bin/sh

yarn --cwd=/app getRoutes "${PWD}/${INPUT_PATTERN}" 1> /dev/null
yarn --cwd=/app generateMd ${INPUT_OUT_PATH}/routes.md



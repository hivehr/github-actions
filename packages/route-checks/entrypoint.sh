#!/bin/sh

yarn --cwd=/app getRoutes "${PWD}/${INPUT_ROUTES_SEARCH_PATH}" 1> /dev/null
yarn --cwd=/app generateMd ${INPUT_ROUTES_DOCS_PATH}/routes.md



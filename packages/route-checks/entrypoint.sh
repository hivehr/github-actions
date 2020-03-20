#!/bin/sh

yarn --cwd=/app generate:routes "${PWD}/${INPUT_PATTERN}" 1> /dev/null
yarn --cwd=/app generate:md ${INPUT_OUT_PATH}/routes.md



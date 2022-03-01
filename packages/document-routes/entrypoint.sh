#!/bin/sh
set -eou pipefail
yarn --cwd=/app generate:routes "${PWD}/${INPUT_PATTERN}" --ignore ${INPUT_IGNORE_PATTERNS} 1> /dev/null
yarn --cwd=/app generate:md ${GITHUB_WORKSPACE}/${INPUT_OUT_PATH}/routes.md ${GITHUB_WORKSPACE}/${INPUT_OUT_PATH}



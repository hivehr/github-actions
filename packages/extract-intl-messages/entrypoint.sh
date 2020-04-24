#!/bin/sh
set -eou pipefail
yarn --cwd=/app babel --config-file /app/babel.config.js "${GITHUB_WORKSPACE}/${INPUT_PATH}" 1> /dev/null
yarn global add rimraf@2.6.2
yarn --cwd=/app/${GITHUB_WORKSPACE}/packages/app intl:postbuild


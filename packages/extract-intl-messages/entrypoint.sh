#!/bin/sh
set -eou pipefail
yarn --cwd=/app babel --config-file /app/babel.config.js "${GITHUB_WORKSPACE}/${INPUT_PATH}"



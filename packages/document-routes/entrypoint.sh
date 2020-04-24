#!/bin/sh
set -eou pipefail
yarn --cwd=/app post:build
yarn --cwd=/app babel --config-file /babel.config.js "src/**/*.ts"
yarn --cwd=/app post:build



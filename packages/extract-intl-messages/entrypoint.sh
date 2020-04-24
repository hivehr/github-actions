#!/bin/sh
set -eou pipefail
yarn --cwd=/app babel --config-file /app/babel.config.js "${GITHUB_WORKSPACE}/${INPUT_PATH}" 1> /dev/null
yarn global add rimraf@2.6.2
yarn global add ts-node@8.4.1

NODE_OPTIONS="--max-old-space-size=4096"
yarn --cwd=/app/${GITHUB_WORKSPACE}/packages/app
yarn --cwd=/app/${GITHUB_WORKSPACE}/packages/app ts-node -TP ${GITHUB_WORKSPACE}/packages/app/tsconfig.webpack.json ${GITHUB_WORKSPACE}/packages/app/scripts/intl/generate-messages-en.ts
yarn --cwd=/app/${GITHUB_WORKSPACE}/packages/app rimraf ${GITHUB_WORKSPACE}/packages/app/build/intl/messages


#!/bin/bash
set -uo pipefail

# Package name should be the first argument passed in
PKG=$1
shift

# Push package directory onto the stack so we can pop it off later
pushd "packages/${PKG}" > /dev/null;

# Execute the given commands
echo "$@"
"$@"

# Pop back to the original directory
popd > /dev/null;

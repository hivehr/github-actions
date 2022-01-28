#!/bin/bash
set -uo pipefail
PATTERN=$1

PACKAGES=($(./scripts/list-packages.sh "${PATTERN}"));

# Find and loop over all packages
for PKG in ${PACKAGES[@]}; do
	# Nice output for easier debugging
	echo "###" packages/${PKG}

	# Execute the values in the package
	source ./scripts/in-package.sh ${PKG} "${@:2}"

	# Insert newline for easier reading
	echo ""
done;

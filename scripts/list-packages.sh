#!/bin/bash
set -uo pipefail
PATTERN=${1:-"*"}
PKG_DIR="packages"

find "${PKG_DIR}" -maxdepth 1 -mindepth 1 -type d -name "${PATTERN}" |
    sed "s|^${PKG_DIR}/||" |
    sort

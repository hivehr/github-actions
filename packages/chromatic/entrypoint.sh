#!/bin/sh
if [[ -n "${WORKING_DIR}" ]]; then
    cd ${WORKING_DIR}
fi

exec node /app/main.js $@


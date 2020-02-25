#!/bin/bash
if [[ -n "${TF_ACTION_WORKING_DIR}" ]]; then
    cd ${TF_ACTION_WORKING_DIR}
fi

exec tflint $@


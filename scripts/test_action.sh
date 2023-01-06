#!/bin/sh

# POSIX compliant method for getting the repository root:
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- $(dirname -- "$0"))" && pwd -P)

# POSIX compliant method for 'pipefail':
fail=$(mktemp)

# Check if 'act' is on the PATH:
act=$(which act || echo > "$fail")

if [ -s "$fail" ]; then
    rm "$fail"
    echo "The GitHub Action tests require 'act' to run workflows."
    echo "See: https://github.com/nektos/act"
    echo
    exit 1
fi

$act -W "$ROOT_DIR/tests/workflows" -j $1

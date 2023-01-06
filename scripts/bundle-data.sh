#!/bin/sh

# POSIX compliant method for getting the repository root:
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- $(dirname -- "$0"))" && pwd -P)

# POSIX compliant method for 'pipefail':
fail=$(mktemp)

js-yaml "$ROOT_DIR/data/Agda.versions.yml" \
| prettier --parser=json > "$ROOT_DIR/src/data/Agda.versions.json" \
|| echo > "$fail"

js-yaml "$ROOT_DIR/data/Agda.components.yml" \
| prettier --parser=json > "$ROOT_DIR/src/data/Agda.components.json" \
|| echo > "$fail"

js-yaml "$ROOT_DIR/data/agda-stdlib.versions.yml" \
| prettier --parser=json > "$ROOT_DIR/src/data/agda-stdlib.versions.json" \
|| echo > "$fail"

cat "$ROOT_DIR/vendor/haskell/actions/setup/src/versions.json" \
| prettier --parser=json > "$ROOT_DIR/src/data/setup-haskell/versions.json" \
|| echo > "$fail"

cat "$ROOT_DIR/package.json" \
| prettier --parser=json > "$ROOT_DIR/src/data/setup-agda/package.json" \
|| echo > "$fail"

js-yaml "$ROOT_DIR/action.yml" \
| prettier --parser=json > "$ROOT_DIR/src/data/setup-agda/action.json" \
|| echo > "$fail"

js-yaml "$ROOT_DIR/vendor/haskell/actions/setup/action.yml" \
| prettier --parser=json > "$ROOT_DIR/src/data/setup-haskell/action.json" \
|| echo > "$fail"

# Check whether or not any subcommand failed:
if [ -s "$fail" ]; then
    rm "$fail"
    exit 1
else
    rm "$fail"
    exit 0
fi

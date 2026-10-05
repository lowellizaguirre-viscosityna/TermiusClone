#!/usr/bin/env bash
# Some shells (and agent harnesses) export ELECTRON_RUN_AS_NODE=1, which makes
# the electron binary start as plain Node and `require('electron')` return a
# path string instead of the API. Clear it before launching.
set -euo pipefail
cd "$(dirname "$0")"
exec env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron . "$@"

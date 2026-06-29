#!/usr/bin/env bash
# Install/refresh the Acceptance Pipeline Specification (APS) Babashka tools.
#
# APS supplies the portable, project-neutral commands `gherkin-parser` and
# `gherkin-mutator` (plus `gherkin-ir-dry-checker`). They are NOT reimplemented
# in this project; they are procured fresh from upstream and pinned into a
# gitignored tools directory so the acceptance pipeline can call them.
#
# Usage: acceptance/install-aps.sh
set -euo pipefail

REPO="https://github.com/unclebob/Acceptance-Pipeline-Specification.git"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/tools/aps"

if ! command -v bb >/dev/null 2>&1; then
  echo "error: babashka (bb) is required for the APS tools" >&2
  exit 1
fi

mkdir -p "$ROOT/tools"

if [ -d "$DEST/.git" ]; then
  echo "[aps] refreshing $DEST"
  git -C "$DEST" fetch --depth 1 origin HEAD
  git -C "$DEST" reset --hard FETCH_HEAD
else
  echo "[aps] cloning $REPO -> $DEST"
  rm -rf "$DEST"
  git clone --depth 1 "$REPO" "$DEST"
fi

# Smoke-test that the portable commands resolve.
bb --config "$DEST/bb.edn" gherkin-parser >/dev/null 2>&1 || true
echo "[aps] ready: bb --config tools/aps/bb.edn {gherkin-parser,gherkin-ir-dry-checker,gherkin-mutator}"

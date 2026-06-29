#!/usr/bin/env bash
# Normal acceptance run: parse every feature to JSON IR, generate entry points,
# and execute them. This is part of regular verification.
#
# Usage: acceptance/run.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
APS="$ROOT/tools/aps/bb.edn"
IR_DIR="build/acceptance/ir"
GEN_DIR="build/acceptance/generated"

if [ ! -f "$APS" ]; then
  echo "error: APS tools missing; run acceptance/install-aps.sh" >&2
  exit 1
fi

mkdir -p "$IR_DIR" "$GEN_DIR"
status=0
shopt -s nullglob
features=(features/*.feature)
if [ ${#features[@]} -eq 0 ]; then
  echo "[acceptance] no feature files found under features/" >&2
  exit 1
fi

for rel in "${features[@]}"; do
  name="$(basename "${rel%.feature}")"
  ir="$IR_DIR/$name.json"
  echo "[acceptance] $rel"
  bb --config "$APS" gherkin-parser "$rel" "$ir"
  entry="$(ACCEPTANCE_FEATURE_PATH="$rel" node "$ROOT/acceptance/generate.ts" "$ir" "$GEN_DIR" | sed -n 's/^generated //p')"
  if [ -z "$entry" ]; then
    echo "[acceptance] generation produced no entry point for $rel" >&2
    status=1
    continue
  fi
  if ACCEPTANCE_IR="$ir" node "$entry"; then
    echo "[acceptance] PASS $rel"
  else
    echo "[acceptance] FAIL $rel" >&2
    status=1
  fi
done

exit $status

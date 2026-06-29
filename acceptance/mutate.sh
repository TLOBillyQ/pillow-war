#!/usr/bin/env bash
# Acceptance mutation run: mutate Gherkin example values and confirm the
# generated tests fail (kill) when important example data changes. Slower than
# a normal run, so it is a deliberate quality workflow.
#
# Usage: acceptance/mutate.sh [level]   # level = full | hard | soft (default hard)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
APS="$ROOT/tools/aps/bb.edn"
LEVEL="${1:-hard}"
WORK="build/acceptance-mutation"
GEN_DIR="$WORK/generated"

if [ ! -f "$APS" ]; then
  echo "error: APS tools missing; run acceptance/install-aps.sh" >&2
  exit 1
fi

mkdir -p "$WORK/base" "$GEN_DIR"
status=0
shopt -s nullglob
features=(features/*.feature)
if [ ${#features[@]} -eq 0 ]; then
  echo "[mutation] no feature files found under features/" >&2
  exit 1
fi

for rel in "${features[@]}"; do
  name="$(basename "${rel%.feature}")"
  ir="$WORK/base/$name.json"
  echo "[mutation] $rel (level=$LEVEL)"
  bb --config "$APS" gherkin-parser "$rel" "$ir"
  ACCEPTANCE_FEATURE_PATH="$rel" node "$ROOT/acceptance/generate.ts" "$ir" "$GEN_DIR" >/dev/null
  if bb --config "$APS" gherkin-mutator \
    --feature "$rel" \
    --generated-dir "$GEN_DIR" \
    --work-dir "$WORK" \
    --level "$LEVEL" \
    --workers 8 \
    --status-interval 5s \
    --runner-worker "node $ROOT/acceptance/runner-adapter.ts"; then
    echo "[mutation] PASS $rel"
  else
    echo "[mutation] survivors/errors in $rel" >&2
    status=1
  fi
done

exit $status

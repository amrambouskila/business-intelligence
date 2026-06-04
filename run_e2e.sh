#!/usr/bin/env bash
# Visual-regression gate (Gate 3): render every chart in a real browser and compare
# against the committed screenshot baselines. Runs inside the pinned Playwright image
# so results are identical to CI regardless of host OS.
#
#   ./run_e2e.sh            compare against baselines (fails on visual drift)
#   ./run_e2e.sh update     regenerate the baselines (after an intended visual change)
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.60.0-noble"
MODE="${1:-check}"
PW_ARGS=""
[ "$MODE" = "update" ] && PW_ARGS="--update-snapshots"

echo "==> Playwright visual gate ($MODE) in $IMAGE"
# Anonymous volume over node_modules: the container installs a fresh Linux tree
# without clobbering the host's (possibly Windows/macOS) node_modules.
docker run --rm --ipc=host \
  -v "$(pwd):/work" -v /work/node_modules -w /work \
  -e CI=true \
  -e E2E_WORKERS="${E2E_WORKERS:-1}" \
  "$IMAGE" \
  bash -lc "npm ci && npm run build && npx playwright test ${PW_ARGS}"

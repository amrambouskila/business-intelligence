# Versions — Business Intelligence

## v0.3.0 — Full alignment with global CLAUDE.md

### Base-image security patch for the alpine runtime stage (2026-08-26)

- **`RUN apk upgrade --no-cache` added to `Dockerfile`.** The `nginx:alpine` base currently ships
  `libcrypto3`/`libssl3` 3.5.7-r0, which Trivy flags HIGH (`CVE-2026-14456`, an OpenSSL QUIC-server
  DoS, fixed in 3.5.8-r0). The packages come from the base layer, so nothing in the Dockerfile
  installs them and nothing below can remediate them -- the upgrade has to happen at build time.
  Measured directly against the base image: **2 HIGH before the layer, 0 after**.
- **Why this needed a change at all.** `nginx:alpine` measured clean during the 2026-08-24
  base-image sweep. The advisory landed afterwards. A base image being clean is a point-in-time
  observation, not a property, which is precisely why the patch layer belongs in the Dockerfile
  rather than being skipped on the strength of a past scan. This is the alpine counterpart to the
  `apt-get upgrade` layer the Debian bases already carry.
- **Not gated by CI here.** This repo's pipeline has no `trivy image` step, so the layer is
  preventive hardening rather than a fix for a failing stage. The base-image measurement
  above is what supports it; no image scan is claimed for this repo.

**Semver reasoning:** Patch. A build-time base-image security patch. No application code,
dependency, host port, API or data contract, and no test changed.


### CI hardening + dependency remediation (2026-08-24)

- **Semgrep invocation corrected.** The job used `semgrep ci` with `--severity` and `--error`, which that subcommand does not accept — it exits 2 with a usage error before scanning. Switched to `semgrep scan`, which supports both.
- **Release workflow hardened against script injection.** `${{ inputs.bump }}` and `${{ steps.bump.outputs.new_version }}` were interpolated directly into `run:` blocks, where the value becomes shell code. Both now pass through `env:` and are read as quoted shell variables. The input is `type: choice`, so this was not exploitable today — it is the pattern that breaks the moment the input type changes.
- **Security headers now actually delivered.** nginx inherits `add_header` from an enclosing level only when the current level declares none of its own, and the cache-control `location` blocks declared their own — silently dropping CSP, `nosniff`, `X-Frame-Options` and `Referrer-Policy` there. Because the SPA resolves through `try_files ... /index.html`, the document itself was served with **zero** security headers. Verified by serving the config in `nginx:alpine` and curling `/`: 0 headers before, 4 after. They are now repeated in each affected block, with a comment explaining why the duplication must stay.
- **Dockerfile `missing-user` suppressed with written justification**, per global CLAUDE.md section 9 (non-root is not required for personal local-dev containers). The nginx images additionally cannot run as non-root without the unprivileged image and a port change. Revisit before any deployment beyond localhost.
- **Removed the unused `@deck.gl/geo-layers` dependency.** All 8 high advisories reached this project through it (`-> @luma.gl/gltf -> @loaders.gl/textures -> texture-compressor -> image-size`, whose advisory has no patched release in any version). The package was declared but never imported — the code uses `@deck.gl/core`, `/layers`, `/aggregation-layers` and `/react`. Removing it takes `npm audit --audit-level=high` to zero and made the previously-added `image-size` override unnecessary, so that was removed too. npm's own suggested fix was a `@deck.gl/geo-layers` 9.3 -> 8.9 downgrade, which would have broken the app.
- Verified after removal: production build succeeds, 229 test files / 1509 tests pass.


### 2026-08-20 — Security documentation (SAST stage + input-boundary inventory)

No chart-count change: **193/193** registered charts. Documentation first, then the wiring — see the following subsection.

- Added a `<security>` section (§10a) to `CLAUDE.md`/`AGENTS.md`: the `sast` CI stage requirement (`lint → sast → typecheck → test+coverage → build → docker`; Semgrep SARIF + CodeQL + `npm audit --audit-level=high` + gitleaks, Trivy in `docker`, fail on HIGH/CRITICAL, MEDIUM triaged with written justification), the ESLint security-plugin requirement, the local-parity SAST command set, and a full input-boundary inventory (file parsers, chart rendering, filter/annotation inputs, exports, chart-spec import, persisted state, env/build config, nginx static serving, Phase 4 backend) with named injection classes and required defenses.
- Master plan: new §4 "Security" subsection, a Security row in the cross-phase concerns table, and the two SAST/injection-safety gate lines on every phase gate (Phase 1 retroactively) plus the Phase 2 definition-of-done list.
- `docs/status.md`: new "Security" section, rewritten into Wired / Pending once the wiring landed.
- `.codex/commands/pre-commit.md`: new SAST audit step and a `SAST` row in the verdict table.

### 2026-08-20 — Security wiring (SAST stage, lint plugins, CSP, CSV formula neutralisation)

No chart-count change: **193/193**.

- **`.github/workflows/ci.yml`**: new `sast` job (`needs: lint`, `permissions: security-events: write`) running CodeQL `javascript-typescript`, `pipx run semgrep scan --config auto --config p/owasp-top-ten --config p/typescript --config p/react --config p/docker --severity ERROR --error` with SARIF upload plus a fail-on-findings step, `gitleaks/gitleaks-action@v2`, and `npm audit --audit-level=high`. `typecheck` and `test` now carry `needs: sast`. The `docker` job builds with `load: true` and runs `aquasecurity/trivy-action@0.28.0` (`HIGH,CRITICAL`, `exit-code: 1`, `ignore-unfixed: true`).
- **`eslint.config.js`**: added `eslint-plugin-security` + `eslint-plugin-no-unsanitized` (recommended configs). `npm run lint` reports 0 errors (`detect-object-injection` warnings only).
- **`nginx.conf`**: added `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. `style-src` keeps `'unsafe-inline'` with an inline comment explaining the ECharts/Tailwind runtime-style requirement; `script-src` is `'self'` only.
  - **Correction (same version): the headers above were not actually being delivered.** nginx inherits `add_header` from an enclosing level only when the current level declares none of its own, and `/assets/` and `= /index.html` declare their own `add_header Cache-Control`, which silently dropped all four security headers there. Because `location /` resolves the SPA through `try_files ... /index.html`, **the document itself was served with zero security headers** — verified by serving the config in `nginx:alpine` and curling `/`: 0 security headers before, 4 after. The four headers are now repeated inside each affected location block (with a comment explaining why the duplication must stay). `nginx -t` passes on the repaired config.
- **`package.json`**: added a `sast` script for local parity.
- **`src/data/export.ts`**: `escapeCSVCell` neutralises spreadsheet formula triggers — a string cell starting `=`, `+`, `-`, `@`, tab, or CR is prefixed with `'` before the existing quoting rule. Numbers, dates, and nulls are unaffected. This closes the CSV-injection row of the §10a boundary inventory; covered by a new case in `tests/unit/data/export.test.ts` (8 tests pass).
- Patch scope: CI, lint config, static-serving headers, and one export-escaping fix — no chart, contract, or store change. Pending: `.semgrep/` rules; parser prototype-pollution/size caps; `exportFileName` control-character stripping; regex pattern-length cap; local Semgrep/gitleaks/Trivy runs.

### 2026-06-25 — CI: fix e2e visual-regression failure + Node 24 action modernization

No chart-count change: **193/193** registered charts.

- Fixed the failing **Visual Regression (Playwright)** stage. `dorny/test-reporter` shells out to `git ls-files` inside the pinned `mcr.microsoft.com/playwright` container, where the host-mounted workspace is owned by a different uid than the in-container git user, so git aborted with `fatal: detected dubious ownership` (exit 128). Added a `git config --global --add safe.directory "$GITHUB_WORKSPACE"` step before the reporter, gated on the same `if: ${{ !cancelled() }}` so it also runs when the E2E step fails.
- Modernized every GitHub Action to its Node 24 major ahead of the **Sept 16 2026** removal of Node 20 from runners (Node 20 actions have been force-run on Node 24 with a deprecation warning since Jun 2 2026): `actions/checkout` v4→v7, `actions/setup-node` v4→v6, `actions/upload-artifact` v4→v7, `dorny/test-reporter` v1→v3, `docker/setup-buildx-action` v3→v4, `docker/build-push-action` v5→v7. Latest majors confirmed against the GitHub releases API.
- The project's `node-version: 20` for build/test steps is intentionally unchanged (matches `node:20-alpine` in the Dockerfile) — only action runtimes moved to Node 24.
- Verification: `ci.yml` parses as valid YAML locally and every action tag was confirmed as the current Node-24 major via the GitHub API. Final confirmation is the next pipeline run on push.

### 2026-06-04 - Generated artifact tracking audit

No chart-count change: **193/193** registered charts.

- Verified `node_modules/` and `dist/` are no longer tracked (`git ls-files node_modules` and `git ls-files dist` both return 0), with both paths ignored in `.gitignore`.
- Updated the local-dev caveat so it no longer describes a committed macOS-ARM dependency tree as current state; fresh clones still require `npm ci` on the target OS.
- Verification: repository tracking audit clean; docs-only change, no runtime test required.

### 2026-06-04 - Layer axis assignment controls

No chart-count change: **193/193** registered charts.

- The Layers tab now exposes each layer's `axis` field through compact `y1`/`y2` controls, making secondary-axis intent reachable from the UI instead of only existing in store/spec state.
- Composed chart layer wrappers now include `data-layer-axis`, keeping rendered layer metadata aligned with layer-store state for diagnostics and export-adjacent paths.
- Verification: focused Sidebar/ChartArea tests green (**35 tests**); full suite green (**1508 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 - Chart-spec layer stack export

No chart-count change: **193/193** registered charts.

- Chart-spec JSON export now includes the complete layer stack plus `activeLayerIndex`, so composed charts can export a restorable spec instead of only the active layer.
- The legacy `activeLayer` field remains in the payload for compatibility with existing consumers.
- Verification: focused export/Sidebar tests green (**24 tests**); full suite green (**1507 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Composed PNG export

No chart-count change: **193/193** registered charts.

- Chart PNG export now composites multiple exportable canvases in DOM order so visible chart-layer overlays export as one image instead of only the first canvas.
- Single-canvas exports keep the existing direct serialization path; compositing fails closed when a canvas context or PNG data URL is unavailable.
- SVG export remains first-SVG-node serialization.
- Verification: focused export-image tests green (**12 tests**); full suite green (**1505 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Basic layer compositing

No chart-count change: **193/193** registered charts.

- `ChartArea` now mounts every visible, fillable layer into the same chart render root, enabling basic layer composition while keeping active-layer column controls scoped to the selected layer.
- Hidden layers and layers with unfilled required roles are excluded from the composed render surface.
- Each renderer still owns its own mounted subtree/canvas; shared-axis option merging and `axis: y1/y2` behavior remain future Phase 3 work.
- Verification: focused Sidebar/ChartArea tests green (**34 tests**); full suite green (**1500 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Layer visibility wiring

No chart-count change: **193/193** registered charts.

- Added hide/show controls to the Layers tab, backed by the existing `LayerConfig.visible` state.
- `ChartArea` now respects hidden active layers by unmounting the chart renderer and showing a hidden-layer state.
- Full multi-layer compositing and `axis: y1/y2` behavior remain future Phase 3 work.
- Verification: focused Sidebar/ChartArea tests green (**31 tests**); full suite green (**1497 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Documentation debt closeout

No chart-count change: **193/193** registered charts.

- Updated the project guide's `src/lib` tree so it reflects the current formatter/download/palette helper files instead of the removed `lib/color.ts`.
- Marked the roadmap's hard-coded UI color and `lib/color.ts` debts as resolved based on current source: UI color literals are gone, `formatBytes.ts`/`formatNumber.ts` are split, and `categoricalColor.ts` owns palette indexing.
- Verification: source audit found no remaining `#fff`, `text-white`, `bg-white`, or `accent-blue-500` literals in `src/components`, `src/charts`, `src/lib`, `src/stores`, `src/data`, or `src/app`; the only app-source `#ffffff` match is in `src/theme/tokens.ts`.

### 2026-06-04 — Sidebar structure cleanup

No chart-count change: **193/193** registered charts.

- Split the sidebar tab implementations by concept: `Sidebar.tsx` is now only the tab host, `DataTab.tsx` owns dataset/filter/annotation/export controls, and `LayersTab.tsx` owns layer activation/removal.
- Kept the public `Sidebar` import stable and preserved existing UI behavior through the existing component coverage.
- Verification: focused Sidebar tests green (**16 tests**); full suite green (**1495 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` green.

### 2026-06-04 — deck.gl switch-stress visual coverage

No chart-count change: **193/193** registered charts.

- Added a real-browser Playwright stress spec that repeatedly switches through deck.gl geographic MapView charts and 3D OrbitView charts, including dataset changes.
- The stress spec fails on page errors, unfilled chart role state, or missing canvases, covering the previously deferred repeated chart-change WebGL cleanup path.
- Hardened the visual suite against slow first renders with a 60s per-test timeout, 15s assertion timeout, and exact Charts-tab readiness locator.
- Verification: targeted pinned-Docker Playwright stress test green (**1 test**); full pinned-Docker Playwright gate green (**194/194 tests**, including 193 chart renders plus the deck.gl switch-stress test).

### 2026-06-04 — Phase 2 CI closeout

No chart-count change: **193/193** registered charts.

- Pushed the hardened visual-regression closeout to `main` at `125061d5`.
- Confirmed GitHub Actions run #5 green across lint, typecheck, test+coverage, build, Docker build, and the 193-chart Playwright visual-regression gate.
- Updated the master plan, execution roadmap, and live status so Phase 2 is no longer described as only locally complete.

### 2026-06-04 — Visual gate CI hardening

No chart-count change: **193/193** registered charts.

- Hardened the Playwright visual-regression harness by making worker count explicit and conservative: CI and Docker wrappers now default to `E2E_WORKERS=1`, with local override support.
- Increased Playwright expectation timeout to 15s so slow first screenshots do not rely on retry behavior.
- Regenerated the pinned Docker `flow_map` baseline after the stable CI-sized render root measured 1056px wide instead of the older 1024px capture.
- Verification: focused e2e drift/backend-doc tests green (**3 tests**); targeted pinned-Docker `flow_map` and `loess_smoother_plot` checks green; full pinned-Docker Playwright check passed **193/193** charts with `E2E_WORKERS=1`; `npx tsc --noEmit` green.

### 2026-06-04 — Chart backend catalog annotation

No chart-count change: **193/193** registered charts.

- Added a `CHARTS.md` renderer backend catalog for every registry type ID, documenting which charts render through ECharts, deck.gl, regl, and Canvas2D.
- Added a registry-driven drift guard that compares `CHARTS.md` against `ChartDefinition.renderer` for all loaded chart families and fails on missing, duplicated, stale, or incorrect backend annotations.
- Verification: focused charts-doc/registry tests green (**3 tests**); full suite green (**1495 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Windows launcher verification

No chart-count change: **193/193** registered charts.

- Verified `bi_service.bat` on Windows with `BI_PORT=5182`.
- The launcher built the Docker image, started the nginx container, printed the expected service URL/menu, accepted the `k` stop option from stdin, and stopped/removed the container/network while keeping the image.
- Verification command: `$env:BI_PORT='5182'; 'k' | cmd /c bi_service.bat` exited 0.

### 2026-06-04 — Filter row-count feedback

No chart-count change: **193/193** registered charts.

- The Data tab now shows `Showing N of M rows` above the filter controls so users can see the immediate impact of active filters.
- CSV export now reuses the same filtered `DataView` computed for the UI row-count summary, keeping filter feedback and export behavior aligned.
- Verification: focused Sidebar tests green (**16 tests**); full suite green (**1494 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Responsive workspace polish

No chart-count change: **193/193** registered charts.

- The main workspace now stacks sidebar-over-chart on narrow screens while preserving the desktop sidebar/chart row layout.
- The mobile sidebar has a bounded scrollable height, and the chart header controls can scroll horizontally instead of pushing the page wider than the viewport.
- Verification: focused Sidebar/ChartArea tests green (**28 tests**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green; Playwright metrics at 1280×800 and 390×844 showed no page overflow and a visible chart render area.

### 2026-06-04 — Upload format affordance polish

No chart-count change: **193/193** registered charts.

- Updated the hidden toolbar file input to accept every frontend-supported import format: `.csv`, `.tsv`, `.json`, `.xlsx`, `.xlsm`, and `.parquet`.
- Added toolbar coverage so future parser additions cannot be hidden from the upload file picker by accident.
- Verification: focused toolbar tests green (**15 tests**); full suite green (**1493 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Vendor bundle split

No chart-count change: **193/193** registered charts.

- Added Vite/Rolldown code-splitting groups for stable vendor buckets: React, ECharts/zrender, deck.gl/luma/loaders, D3, Radix/lucide, file-format parsers, and fallback vendor modules.
- Production build now separates the app entry from heavy vendor libraries; the app entry is ~163 kB minified instead of the prior ~1.68 MB combined app/vendor chunk.
- The build warning remains for large ECharts/deck.gl vendor chunks; docs now describe that residual risk accurately instead of treating all chunking as future work.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `npm run build` green.

### 2026-06-04 — Parquet import

No chart-count change: **193/193** registered charts.

- Added Parquet `.parquet` import via `hyparquet`, routing columnar files into the same `DataSet` pipeline as CSV/TSV, JSON, and Excel.
- The parser reads real Parquet row objects, unions sparse row keys into stable first-seen column order, converts Date values to ISO strings, converts safe bigint values to numbers, and preserves unsafe bigint values as strings for downstream metadata analysis.
- Added real generated-Parquet parser coverage via `hyparquet-writer`, loader routing coverage, and explicit registry-loader hook timeouts for coverage-instrumented all-chart imports.
- Verification: focused Parquet/loader/registry tests green (**49 tests**); full suite green (**1492 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` green.

### 2026-06-04 — Excel workbook import

No chart-count change: **193/193** registered charts.

- Added Excel `.xlsx`/`.xlsm` import via `read-excel-file`, routing workbooks into the same `DataSet` pipeline as CSV/TSV and JSON.
- The parser uses the first non-empty row as headers, skips blank data rows, fills missing trailing cells with `null`, generates stable names for blank header cells, and converts Date cells to ISO strings before the existing import-normalization pass.
- Added real generated-XLSX parser coverage plus loader routing coverage for `.xlsx` and `.xlsm`.
- Verification: focused Excel parser/loader tests green (**14 tests**); full suite green (**1487 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` green.

### 2026-06-04 — First regl catalog chart: image_raster_plot

No chart-count change: **193/193** registered charts.

- Migrated `image_raster_plot` from ECharts heatmap output to `ReglBaseRenderer`, making regl a proven catalog backend rather than only renderer infrastructure.
- The regl raster plot preserves the existing row/column/intensity contract, finite-value filtering, theme-token sequential coloring, flat-range handling, invalid-color fallback, and empty-state behavior.
- Regenerated the deterministic Gate-3 `image-raster-plot` screenshot baseline and verified it in targeted Docker update/check mode.
- Verification: focused image-raster/regl/registry/e2e-coverage tests green (**19 tests**); full suite green (**1480 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit` green; pinned Docker Playwright check passed **193/193** charts with `--workers=4`.

### 2026-06-04 — First Canvas2D catalog chart: gauge

No chart-count change: **193/193** registered charts.

- Migrated `gauge` from ECharts to `Canvas2DBaseRenderer`, making Canvas2D a proven catalog backend rather than only renderer infrastructure.
- The Canvas2D gauge preserves aggregate options (`mean`/`max`/`min`/`sum`), finite-value filtering, two-decimal display rounding, empty-state behavior, and theme-token drawing.
- Regenerated the deterministic Gate-3 `gauge` screenshot baseline and verified it in targeted Docker update/check mode.
- Verification: focused gauge/Canvas2D/registry/e2e-coverage tests green (**29 tests**); full suite green (**1478 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit` green; pinned Docker Playwright check passed **193/193** charts with `--workers=4`.

### 2026-06-04 — Regl renderer base backend

No chart-count change: **193/193** registered charts.

- Added `ReglBaseRenderer` and `ReglChart`, making `regl` a live renderer backend instead of a reserved type string.
- `ReglChart` owns a dedicated canvas, creates the WebGL context/regl instance, applies device-pixel-ratio backing-store sizing, redraws on resize, skips drawing when WebGL is unavailable, and destroys both chart-specific resources and the regl instance on unmount.
- Updated the registry contract harness so future `regl` charts must extend `ReglBaseRenderer`; the first regl catalog chart shipped later via `image_raster_plot`, while shader-file conventions remain future M5 follow-on work.
- Verification: focused regl renderer/registry-contract tests green (**10 tests**); full suite green (**1477 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit` green.

### 2026-06-04 — Shape detector semantic-shape closeout

No chart-count change: **193/193** registered charts.

- `detectShape` now emits the remaining documented semantic shapes: `geo_polygons`, `survival`, and `event_log`.
- `geo_polygons` detection covers explicit geometry columns and simple `region,value` tables without reclassifying ordinary region-plus-multiple-metric sales data; coordinate datasets still take `geo_points` precedence.
- `survival` now covers `time,event[,group]` datasets and keeps the existing survival/cumulative-hazard charts in the ranked suggestion path.
- `event_timeline` now declares `event_log` compatibility, and chart auto-assignment recognizes common role aliases such as `timestamp` for `date` and `event` for `label`.
- Verification: focused detector/sample/suggestion/event-timeline/chart-area tests green (**145 tests**); full suite green (**1470 Vitest tests / 100% coverage**); `npx tsc --noEmit`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit` green.

### 2026-06-04 — Phase 2 catalog completion: 193/193

**Chart count 192 → 193.** Resolved the final catalog/count overlap: `qq_plot` now registers from the Distribution family, and Statistical now has its catalog-specific `confusion_matrix_chart`. Distribution is **21/21**, Statistical is **19/19**, and every family is at target.

- `confusion_matrix_chart` renders actual-vs-predicted classification counts as a themed ECharts heatmap with labels and sequential visual mapping.
- Updated the statistical barrel, distribution barrel, Gate-3 chart/sample map, QQ test expectations, and focused confusion-matrix-chart coverage.
- Verification: focused QQ/confusion-matrix/registry/e2e-coverage/suggestion tests green (**49 tests**), full suite green (**1463 Vitest tests / 100% coverage**), `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` all green. Chart status is **193/193** with every family complete. The pinned Docker Playwright update pass wrote the `confusion-matrix-chart` baseline and passed **193/193** charts with `--workers=4`; the follow-up Docker check passed **193/193** charts with `--workers=4`.

### 2026-06-04 — M5 3D slice 6: deck.gl OrbitView 3D family

**Chart count 186 → 192.** Added all six 3D catalog charts: `three_d_scatter`, `three_d_surface`, `three_d_wireframe`, `three_d_contour`, `three_d_bar_chart`, and `three_d_volume_rendering`. The 3D family is now **6/6 complete**.

- Added shared 3D helpers for finite x/y/z extraction, normalization into OrbitView coordinates, value/color scaling, binned surface cells, wireframe paths, and elevated contour paths.
- `three_d_scatter` and `three_d_volume_rendering` render point clouds; `three_d_bar_chart` renders extruded columns; `three_d_surface` renders binned mesh polygons; `three_d_wireframe` and `three_d_contour` render 3D path layers.
- All six charts use the existing deck.gl OrbitView path, so no new renderer contract was needed.
- Verification: focused 3D/registry/sample/e2e-coverage tests green (**75 tests**), full suite green (**1459 Vitest tests / 100% coverage**), `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` all green. Chart status is **192/193** with 3D **6/6 complete**. The pinned Docker Playwright update pass wrote the six 3D baselines and passed **192/192** charts with `--workers=4`; the follow-up Docker check passed **192/192** charts with `--workers=4`.

### 2026-06-04 — M5 geographic slice 5: region and flow maps

**Chart count 180 → 186.** Added the final six geographic charts: `choropleth_map`, `filled_map`, `cartogram`, `flow_map`, `isochrone_contour_map`, and `tile_grid_map`. Geographic is now **14/14 complete**.

- Added shared region and flow helpers for deterministic client-side region polygons, tile-grid layout, value-scaled cartogram polygons, finite origin/destination flow extraction, and region/flow-derived MapView state.
- Expanded the deterministic `geo` sample with `region`, origin/destination coordinate roles, and flow weights so every geographic chart can auto-assign through the real UI path.
- `choropleth_map` and `filled_map` render region polygons colored by aggregated value; `cartogram` scales region polygons by value; `tile_grid_map` lays region values into compact deterministic tiles.
- `flow_map` renders weighted great-circle arcs; `isochrone_contour_map` renders weighted geographic contour thresholds.
- Verification: focused geographic/registry/sample/e2e-coverage tests green (**109 tests**), full suite green (**1450 Vitest tests / 100% coverage**), `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` all green. Chart status is **186/193** with geographic **14/14 complete**. The pinned Docker Playwright update pass wrote the new geographic region/flow baselines and passed **186/186** charts with `--workers=4` after one default-concurrency update hit screenshot timeouts in the geographic deck.gl block; the follow-up Docker check passed **186/186** charts with `--workers=4`.

### 2026-06-04 — M5 geographic slice 4: aggregation and partition maps

**Chart count 176 → 180.** Added four deck.gl geographic charts: `density_map`, `hexbin_map`, `geospatial_heatmap`, and `voronoi_map`. Geographic is now **8/14**.

- `density_map` renders valid latitude/longitude points through a screen-grid aggregation layer with theme-token sequential colors.
- `hexbin_map` renders weighted hexagonal geographic bins, optionally using the sample `value` role as aggregation weight.
- `geospatial_heatmap` renders a weighted deck.gl heatmap over point data.
- `voronoi_map` renders deterministic local geographic partition cells through `PolygonLayer`, keeping the chart client-only and dependency-free beyond deck.gl.
- Verification: focused geographic/registry/sample/e2e-coverage tests green (**98 tests**), full suite green (**1439 Vitest tests / 100% coverage**), `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` all green. Chart status is **180/193** with geographic **8/14**. The pinned Docker Playwright update pass wrote the `density-map`, `hexbin-map`, `geospatial-heatmap`, and `voronoi-map` baselines and passed **180/180** charts; the follow-up Docker check passed **180/180** charts with `--workers=4`.

### 2026-06-04 — M5 geographic slice 3: point-style deck.gl maps

**Chart count 173 → 176.** Added three deck.gl geographic charts: `bubble_map`, `symbol_map`, and `route_map`. Geographic is now **4/14**.

- Added shared geographic deck.gl helpers for finite coordinate extraction, theme-token RGBA conversion, bounds-centered MapView state, numeric radius scaling, and palette selection.
- `bubble_map` renders latitude/longitude points sized by a numeric `value`; `symbol_map` renders category-colored points with text initials; `route_map` renders an ordered geographic path plus stop markers.
- Expanded the deterministic `geo` sample with `category` and `order` roles, and mapped the three new charts into the Gate-3 visual harness.
- Verification: focused geographic/registry/sample/e2e-coverage tests green (**83 tests**), full suite green (**1430 Vitest tests / 100% coverage**), `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit` all green. The pinned Docker Playwright update pass wrote the `bubble-map`, `symbol-map`, and `route-map` baselines and passed **176/176** charts; the follow-up Docker check passed **176/176** charts with `--workers=4` after one default-concurrency run exhausted container memory (`ENOMEM`) before completing.

### 2026-06-04 — M5 renderer slice 2: first deck.gl chart

**Chart count 172 → 173.** Added `point_map`, starting the geographic family at **1/14**.

- Extended deck.gl rendering with Map/Orbit/Orthographic view selection and data-driven initial view state hooks.
- Added the first real deck.gl catalog chart: `point_map` renders finite latitude/longitude rows through `ScatterplotLayer`, filters invalid coordinates, derives a bounds-centered MapView state, and uses theme-token colors.
- Added a deterministic `geo` sample dataset, Gate-3 chart/sample mapping, and the new visual baseline `tests/e2e/__screenshots__/point-map.png`.
- Verification: focused deck.gl/point-map/sample/e2e-coverage tests green (**73 tests**), full suite green (**1415 Vitest tests / 100% coverage**), `npm run lint`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green; the pinned Docker Playwright gate is green in both update and check modes with **173/173 Playwright charts**.

### 2026-06-04 — M5 renderer slice 1: Canvas2D base backend

No chart-count change: **172/193** registered charts.

- Added `Canvas2DBaseRenderer` and `Canvas2DChart`, making `canvas2d` a live renderer backend for future simple custom-canvas charts.
- The wrapper owns a dedicated canvas, device-pixel-ratio backing-store scaling, resize redraw, missing-context safety, empty-state handling through the base renderer, and optional renderer cleanup on unmount.
- Updated the registry contract harness so future `canvas2d` charts must extend the live base class, while `regl` remains blocked until its renderer base lands.
- Verification: focused Canvas2D/registry contract tests green (**8 tests**), full suite green (**1404 Vitest tests / 100% coverage**), `npm run lint`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 keyboard slice 13: command palette

No chart-count change: **172/193** registered charts.

- Added a command palette reachable from the toolbar and `Ctrl/Cmd+K`, with Escape/backdrop dismissal.
- Commands now run existing app actions without new state contracts: switch Data/Charts/Layers/Style tabs, toggle theme, and load sample datasets.
- Verification: focused command-palette/toolbar/ui-store tests green (**25 tests**), full suite green (**1395 Vitest tests / 100% coverage**), `npm run lint`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 image-export slice 12: SVG where supported

No chart-count change: **172/193** registered charts.

- Added SVG export from the chart header for renderers that emit an SVG node. The action scopes extraction to the active `chart-render` root, serializes the first SVG with `XMLSerializer`, and downloads an encoded `image/svg+xml` data URL.
- Extended chart image export helpers with SVG serialization/download coverage, including missing-SVG and serializer-failure handling.
- Verification: focused image-export/chart-area tests green (**19 tests**), full suite green (**1387 Vitest tests / 100% coverage**), `npm run lint`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 image-export slice 11: active chart PNG download

No chart-count change: **172/193** registered charts.

- Added active chart PNG export from the chart header. The action scopes extraction to the active `chart-render` root and downloads the first non-empty canvas as an `image/png` data URL.
- Added reusable image-export helpers for canvas serialization and data-URL downloads, with defensive handling for missing, empty, non-PNG, or tainted canvases.
- Verification: focused image-export/chart-area/download tests green (**16 tests**), full suite green (**1383 Vitest tests / 100% coverage**), `npm run lint`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 annotation slice 10: dataset-scoped row notes

No chart-count change: **172/193** registered charts.

- Extended `annotation-store` so annotations are scoped by dataset and can be cleared globally or per dataset.
- Added reachable annotation controls to the Data tab: row index + note text, add/remove, and clear active-dataset annotations.
- Chart-spec JSON export now includes active-dataset annotations with ISO `createdAt` timestamps.
- Verification: focused annotation/sidebar/export tests green (**25 tests**), full suite green (**1377 Vitest tests / 100% coverage**), `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 export slice 9: filtered CSV + chart spec JSON

No chart-count change: **172/193** registered charts.

- Added pure export helpers for filtered `DataView` CSV serialization, stable export filenames, and chart-spec JSON payloads containing dataset metadata, active layer config, options, and filters.
- The Data tab now exposes CSV and Spec export actions. CSV export uses `applyFilters`, so exported rows match the same filtered view sent to renderers.
- Added a DOM download helper that creates a temporary Blob URL, clicks a disposable anchor, and revokes the URL.
- Verification: focused export/sidebar/download tests green (**19 tests**), full suite green (**1374 Vitest tests / 100% coverage**), `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm audit` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 data-quality slice 8: locale numeric + date import normalization

No chart-count change: **172/193** registered charts.

- Extended `normalizeParsedValue` / `normalizeParsedRows` to parse locale-style numeric formats before metadata analysis and column indexing: decimal commas, dot/space/apostrophe grouping, localized currency placement, comma-decimal percentages, and accounting negatives.
- Added conservative date normalization for date-like columns only. Clear slash/dot/month-name formats normalize to ISO `YYYY-MM-DD`; ambiguous localized dates and non-date text columns are preserved to avoid silently changing categorical labels.
- Loader coverage now proves localized CSV imports produce temporal/numeric metadata, normalized row values, normalized column arrays, and the expected time-series shape.
- Verification: **1367 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 dependency cleanup slice 7: npm audit clean

No chart-count change: **172/193** registered charts.

- Cleared `npm audit`: **0 vulnerabilities** after upgrading `vitest`/`@vitest/coverage-v8` to 4.1.8, `vite` to 8.0.16, compatible Vite plugins, and deck.gl packages to 9.3.3.
- Updated the deck.gl renderer unit-test mock for the 9.3 `DeckGLRef` async picker methods.
- Added focused edge-case tests needed under Vitest 4's stricter branch accounting for store no-op mutations, Kagi/point-and-figure reversal thresholds, sequence actor lane de-duplication, and shape-detector date/object branches.
- Verification: `npm audit` clean, dependency tree pruned/clean, **1362 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 cleanup slice 6: Zustand immer adoption

No chart-count change: **172/193** registered charts.

- Wrapped all five Zustand stores with the documented `immer` middleware and converted manual spread updates to draft mutations.
- Enabled Immer Map/Set support for the dataset store so its `Map<string, DataSet>` can be updated through the same draft path as the array-backed stores.
- Preserved all public store state and action contracts; existing focused store tests continue to cover IDs, active dataset/layer behavior, filters, annotations, and UI state.
- Verification: focused store suite green (**28 tests**), full suite green (**1352 Vitest tests**), **100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 cleanup slice 5: theme-token foregrounds

No chart-count change: **172/193** registered charts.

- Replaced pre-existing hard-coded white foregrounds in the upload and error-boundary action buttons with `var(--bg-primary)`, keeping action text derived from theme variables.
- Refactored `mosaic_plot` empty-state detection so it no longer constructs a fake literal-color `ThemeTokens` object; the colorized path still uses the real runtime theme.
- Added component coverage proving the two action buttons use token-backed foreground styles.
- Verification: **1352 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 validation slice 4: select option membership

No chart-count change: **172/193** registered charts.

- `resolveOptions` now validates `select` options against declared `choices`, so stale/imported invalid values fall back to the chart option default instead of leaking into renderers.
- Select specs without declared choices remain permissive for arbitrary string values.
- Added resolver coverage for invalid select membership and choice-less select specs.
- Verification: **1351 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 data-quality slice 3: formatted numeric imports

No chart-count change: **172/193** registered charts.

- Added `normalizeParsedRows` / `normalizeParsedValue` so loaded rows normalize common formatted numeric strings before column metadata and `columnArrays` are built.
- CSV parsing no longer delegates broad type coercion to PapaParse; it parses as strings and applies the project normalizer, which preserves quoted leading-zero code-like values while still converting ordinary numeric fields.
- Supported formats include currency symbols, thousands separators, signed values, accounting parentheses, and percentages. Invalid numeric-looking strings and leading-zero codes are left unchanged.
- Loader coverage now proves formatted CSV values produce numeric column types, `category_numeric` shape detection, normalized row values, and normalized column arrays.
- Verification: **1349 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-04 — M4 analysis-loop slice 2: optional roles + filter coupling

No chart-count change: **172/193** registered charts, all currently implemented charts remain ECharts-native.

- `ChartArea` now renders optional column-role pickers from each chart definition's `optionalColumns`, filters candidates by accepted type, persists selected optional assignments, and removes the assignment when the blank option is selected.
- Added integration coverage proving filters authored from the Data tab flow through `applyFilters` before renderer invocation, so the visible analysis UI now has tested chart-render coupling.
- Invalid regex filters now fail closed instead of throwing during render (`applyFilters` returns no matches for malformed regex values).
- Verification: **1343 Vitest tests / 100% coverage**, `npm run typecheck`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all green. Playwright baselines were not rerun because no registered chart implementation or visual baseline changed.

### 2026-06-03 — Comprehensive audit + M0 (make it genuinely run)

- **Audit:** ran an 11-agent audit (7-dimension recon + empirical verification + synthesis + adversarial critique). Wrote [`docs/EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) — empirical reality-vs-claims, a concrete "working app" definition, and the M0–M5 milestone plan. Empirically verified (after a clean `npm ci` — the committed `node_modules` was a stale macOS-ARM copy): typecheck clean, lint clean, **191 tests / 100% coverage**, build green.
- **C1 fix — Tailwind v4 now compiles.** Added the `@tailwindcss/vite` plugin to `vite.config.ts` (`@tailwindcss/vite@4.2.2`). Previously `vite.config.ts` loaded only `react()`, so `@import "tailwindcss"` passed through raw and **no utility classes were generated — the app rendered unstyled**. The build's `@theme`/`@tailwind` lightningcss warnings are gone; CSS is now the tree-shaken compiled output (22.5 kB → 14.1 kB). Verified in a real browser end-to-end through a rendered histogram.
- **C2 fix — deterministic family registration.** `src/charts/families/index.ts` no longer auto-loads via a 500 ms `setTimeout` (a race against synchronous registry reads on first paint). `ensureAllFamiliesLoaded()` now memoizes a single load promise; `App.tsx` awaits it and gates the registry-reading panels behind a themed "Loading chart library…" state, so the catalog is always complete before the picker/suggester read it.
- Deferred from M0 after re-examination: the audit's "deck.gl finalize() leak" (C3) is a **false positive** — the mount-snapshot pattern is the correct React idiom; left unchanged. `useActiveChartConfig` resolution moved to M1 (coupled to the config/auto-assign rework).
- No data-contract changes; no source coverage impact (`App.tsx` + `index.ts` barrels are coverage-excluded). 100% coverage maintained.

### 2026-06-03 — M1: foundation abstractions (before breadth)

Removes the scaling traps the audit found, so chart #4..#193 inherit DRY, self-contained infrastructure instead of copy-paste. All test-driven; **239 tests, 100% coverage**, typecheck/lint/build green.

- **Declarative options schema** (additive contract change — see master plan §2): new `ChartOptionSpec` (`src/charts/option-spec.ts`) + optional `options?: ChartOptionSpec[]` on `ChartDefinition`. `resolveOptions` (`src/charts/resolve-options.ts`) is the single place defaults are applied, so the UI control and renderer can't disagree.
- **Generic `ChartOptionsPanel`**: renders controls by mapping `def.options` — zero `chartType` branches. Extracted `NumberOption`/`ToggleOption`/`SelectOption`/`ColorOption` into `src/components/sidebar/controls/` (one concept per file). Controls use `accentColor: var(--accent)` (removed the hard-coded `accent-blue-500`).
- **Dead controls fixed**: `scatter` now reads `pointSize`/`opacity` and `line` reads `smooth` from `config.options` (previously hard-coded and ignored) — verified in-browser (Point Size visibly resizes points).
- **Shared ECharts helpers** (`src/charts/echarts/`): `buildCartesianAxes`, `buildGrid`, `buildTooltip`. The 3 charts were refactored onto them; no chart file contains literal axis/grid/tooltip theme blocks anymore.
- **Empty-data guard**: `EChartsBaseRenderer` renders a themed `EmptyChartState` via overridable `isEmpty`/`emptyMessage` hooks; histogram overrides it (`No numeric values to chart`) so an all-non-numeric column no longer yields a NaN axis.
- **Palette color helper** (`src/lib/categoricalColor.ts`): cycles `theme.colorScale` by series index with a `foreground` fallback for an empty palette. Renamed the misnamed `lib/color.ts` → split into `lib/formatBytes.ts` + `lib/formatNumber.ts`. (The `interpolateSequential`/`interpolateDiverging` value→color scales were initially added here too but **removed during adversarial review as dead code** — no consumer until the heatmap; they land in M3 alongside it.)
- **Name-aware, consume-on-assign auto-assignment** in `ChartArea`: prefers a column named like the role, never assigns one column to two roles (fixes the OHLCV/x-y "same column everywhere" bug), and shows "No compatible column for: …" when a required role can't be filled (removed the `/* v8 ignore */` on the ColumnPicker fallback — now genuinely reachable + tested).
- **Registry contract test harness** (`tests/unit/charts/registry-contract.test.ts`): iterates `chartRegistry.all()` after all families load — validates family/shapes/roles/options and `instanceof` the declared backend's base class, plus a guard that **no chart references a backend without a live base class** (catches a chart pointing at the not-yet-built regl/canvas2d). The scalable replacement for per-chart boilerplate tests.

Adversarial multi-agent review fixes (same day):
- **Histogram empty-guard hardened**: `numericValues` now filters with `Number.isFinite` (was `typeof === 'number'`), so an all-NaN/Infinity column correctly shows the empty state instead of a blank/garbage chart, and binning never sees non-finite edges.
- **Axis-styling regression closed**: `buildCartesianAxes` gained an `axisLine` flag (default on); the 3 charts pass `axisLine: false` on their value y-axis to exactly match the pre-refactor rendering. Added y-axis assertions to all 3 chart tests + the helper test.
- **Dead code removed**: deleted the unconsumed `interpolateSequential`/`interpolateDiverging` (see above).
- **Hardening**: named the number-control default bounds (`DEFAULT_NUMBER_MIN/MAX/STEP`) instead of inline `?? 0/100/1`; typed `buildGrid`/`buildTooltip` override params as ECharts option partials (catches call-site key typos); converted the contract harness from `it.each` (collection-time snapshot) to a loop-in-`it` (runs after families load, so it scales with the catalog); strengthened the renderer `textStyle` test (mock now surfaces the merged color/font) and added a chart-level color assertion to scatter.
- **Noted, not fixed (out of M1 scope):** pre-existing hard-coded `#fff` in Sidebar/Toolbar/ErrorBoundary, a tautological self-equality assertion in `registry.test.ts`, and an optional discriminated-union typing of `resolveOptions` — all tracked for follow-up.

### 2026-06-03 — M2: wire the shape→ranked-suggestion differentiator

The master-plan headline flow now exists in the running app. Test-driven; **225 tests, 100% coverage**, typecheck/lint/build green; verified in a real browser (the picker shows "Suggested for category numeric data → Histogram" with a "Show all charts" escape hatch).

- **Relevance scoring** (`src/data/chart-suggester.ts`): rewrote `suggestCharts(shape, columns)` to return `ChartDefinition[]` ranked by a new `scoreChart(def, shape, columns)` — shape-compatible **and** column-fillable charts only, most-specialized (fewest compatible shapes) first, name tiebreak. Deleted the drifting `defaultSuggestions` map (it referenced ~50 unregistered chart types).
- **`ChartPicker` wired** (`src/components/sidebar/ChartPicker.tsx`): reads the active dataset's shape + columns and shows a ranked "Suggested for <shape>" section; "Show all charts" toggles to the full family catalog, "← Back to suggestions" returns. With no active dataset (or no compatible charts) it falls back to the catalog, so existing behavior is preserved.
- **Shape-detector remediation** (`src/data/shape-detector.ts`):
  - Relaxed `category_numeric` — now any `category + ≥1 numeric` (was exactly 1 numeric), so common grouped-bar data (`region, sales, profit`) no longer falls through to `generic`. Restructured the numeric ladder: `many_numeric` (≥5) → `category_numeric` (cat + few numerics) → pure `three/two/single_numeric`.
  - Added `matrix` detection (`row + col + numeric value`) — makes the previously-unreachable `matrix` shape detectable, ready for M3's heatmap.
  - Fixed the `'at'` substring datetime bug: removed bare `'at'` from the date-name list (it forced columns like `category`/`status`/`latitude` toward `datetime`).
  - Named all inference/detection thresholds (`SAMPLE_SIZE`, `MANY_NUMERIC_MIN`, etc.) — no more magic numbers.
- **Also:** fixed the tautological `suggestForShape` self-equality assertion in `registry.test.ts` (now asserts `[]`).
- **Deliberately deferred (documented):**
  - **String→number value coercion** in `inferType` (thousands separators, currency): doing it on the *type* alone — without coercing the actual `columnArrays` values in the loader — would create a type/data mismatch (a column typed `float` whose values are still strings would render empty). Needs a coordinated loader change; deferred to a focused data-quality pass.
  - **`survival`/`event_log`/`geo_polygons` detection**: no chart consumes these until M5, and aggressive name-matching (e.g. a `time`+`event` time series → `survival`) would *degrade* real suggestions to an empty set. Left undetected until their charts land; the enum variants remain for forward-compat.

Adversarial multi-agent review fixes (same day):
- **`isFillable` now matches DISTINCT columns** (consume-on-assign, mirroring `ChartArea`), so a future chart needing N same-typed columns isn't suggested when fewer exist; `suggestCharts`' `columns` param is now required (removed the empty-default footgun).
- **`matrix` detection tightened** to require named `row + col + value` (was `row + col + any numeric`), so integer index columns named row/col don't mis-fire — with a negative test.
- **`showAll` resets on dataset change** in `ChartPicker` (a `useEffect` on `dataset.id`), so loading a 2nd dataset returns to its fresh suggestions instead of stranding the user in the previous catalog.
- **Removed a dead `&& numCols.length >= 1` predicate** in the time-series branch (already guaranteed by the outer guard).
- **Test gaps closed:** the suggester is now exercised against the **real** registered charts (pins the actual ranked output per shape — e.g. `category_numeric → histogram`, `two_numeric → line, scatter`); the picker test asserts **DOM order** (specialist before generalist), not just presence.
- **Doc drift fixed:** the stale `chart-suggester.ts # ... defaultSuggestions` file-tree comment in `CLAUDE.md` + `AGENTS.md` now reads `scoreChart + suggestCharts`.
- **Noted, not fixed:** the `1 + 1/len` specificity score ignores column-fit and uses a name tiebreak (defensible, tested Phase-2 heuristic — refine in M3 when ordering matters); `numCols === 4 && no category → generic` (pre-existing gap; `isFillable` still surfaces the right charts); `'numeric'` in chart `acceptedTypes` is dead (detector emits `integer`/`float`, never bare `numeric`).

### 2026-06-03 — M3 wave 1: 12 everyday-analyst charts (the "working app" milestone, in progress)

Produced 12 ECharts-native charts via a 12-agent fan-out workflow on the M1 helper layer, then integrated to 100% coverage. **Chart count 3 → 15.** typecheck/lint/build green; confirmed in a real browser — `category_numeric` data now suggests Bar / Donut / Horizontal Bar / Pie / Histogram (ranked, with grouped/stacked bar correctly withheld for a single-category dataset), and a bar chart renders.

- **categorical:** `bar`, `horizontal_bar`, `grouped_bar`, `stacked_bar`
- **composition:** `pie`, `donut`
- **time-series:** `area`, `stacked_area`, `multi_line`, `step`
- **relationships:** `bubble`
- **matrix:** `heatmap` (exercises M2's new `matrix` shape; ECharts `visualMap` themed via `theme.sequentialScale`)
- Family barrels wired (categorical/composition/matrix populated, time-series/relationships extended). The per-family lazy chunks now carry real code (categorical 4.3 kB, composition 1.7 kB, matrix 1.3 kB) instead of 0 kB — M1's code-splitting paying off.
- Every chart declares `compatibleShapes` + `requiredColumns` aligned with the shape detector and the M2 suggester, uses the shared helpers (`buildCartesianAxes`/`buildGrid`/`buildTooltip`, `categoricalColor`), registers via side-effect import, and is validated by the registry contract harness plus a focused `buildOption` test (pivot output, cell mapping, size scaling, empty/missing-column fallback).
- Coverage: replaced two genuinely-unreachable `?? fallback`s (heatmap cell index, stacked_area series data — both guaranteed-present by construction) with `!`; added non-monotonic-value tests for the heatmap/bubble min-max reduces.

Adversarial multi-agent review fixes (31-agent review; 21 confirmed findings, 2 high):
- **Root-cause consolidation:** the long-form pivot was reimplemented 3× divergently. Extracted one shared `src/charts/echarts/pivotLongForm.ts` (index-addressed — no string-key collision; sums duplicate (key,group) rows; 0-backfills missing cells; drops non-finite) and refactored grouped_bar, stacked_bar, and stacked_area onto it. This fixes **both high bugs at once**: grouped_bar's `${sub} ${cat}` key **collided on space-bearing labels** ("North"/"West Region" vs "North West"/"Region") and did last-write-wins instead of summing; stacked_area **backfilled `null`** (breaking the stacked baseline) instead of 0.
- **pie/donut consolidation:** extracted `finiteCategoryValues` shared by both; pie now filters non-finite values and shows the empty state (it previously rendered NaN slices, mislabeling every percentage) — matching donut.
- **Contract/suggester alignment:** `area`/`step` now list `time_series_numeric` (like `line`) so they're suggested for datetime+category+numeric data; heatmap `row`/`col` accept `integer` so integer-indexed matrices are suggestable; standardized category/subgroup `acceptedTypes` to `['category','text']` (removed inconsistent `'boolean'`).
- **Tests:** new suggester-level test (`m3-chart-suggestions.test.ts`) verifying every new chart's shape/column wiring (grouped/stacked bar withheld with 1 category, surfaced with 2; bubble for three_numeric; heatmap for matrix; line/area/step for time_series_numeric); grouped_bar duplicate-row-sum + space-label regression tests; pie NaN-drop + empty-state tests; stacked_area `[10,20,0]` (was `null`). Cleaned a degraded type annotation in multi_line.
- **Noted, not fixed:** bar/pie not suggested when a datetime column dominates the detected shape (the "one dataset, multiple candidate shapes" problem — a suggester-design item for later); line/area/step still duplicate the single-series time-axis block (low, no bug — a cleanup-pass candidate like the pivot was); categorical charts plot one bar per raw row (a group-by **aggregation transform** is the real fix — wave-2 candidate).

### 2026-06-03 — M3 wave 2: stats infra + 10 math/structural charts

**Chart count 15 → 25.** A multi-phase workflow built a reference-validated stats layer (barrier) then fanned out 10 charts on it. typecheck/lint clean, **419 tests / 100% coverage** (after the review pass below), build green.

- **Reference-validated stats infra** (`src/data/stats/`): `quantiles` (type-7/linear-interpolation percentiles — five-number summary), `kernelDensity` (gaussian KDE, Silverman bandwidth with σ===0/n<2 fallback, injectable bandwidth), `buildHierarchy` (flat id/parent/value → nested `TreeNode[]`, roots = null/absent parent, self-parent guard). Each tested against documented reference values (no-mock-math).
- **Charts:** distribution `box_plot` (per-group quantiles), `ecdf`, `kde`; finance `candlestick` (OHLCV → `[open,close,low,high]`), `volume`; network-flow `sankey` (source∪target nodes + links), `funnel`; hierarchical `treemap`, `sunburst` (via `buildHierarchy`); categorical `lollipop`. All 5 affected family barrels wired; finance/network-flow/hierarchical chunks now carry real code.
- **Integration coverage fixes:** corrected the KDE "integral≈1" test (its premise was wrong — Silverman gives a large `h` here, so the density genuinely extends beyond `[min,max]`; pinned a small bandwidth so the in-range integral ≈1); added non-monotonic-input and grouped-non-finite / absent-group-column tests for the kernelDensity/box_plot min-max + branch paths; cast `el.props` in the kde/sankey empty-guard tests (union-type narrowing).

Adversarial multi-agent review fixes (same day; 15 confirmed findings, 8 actioned → **405 → 419 tests**, 100% coverage held):
- **`buildHierarchy` infinite-tree hang (high).** A parent chain that closed a cycle (mutual `a↔b`, or a longer ring `a→b→c→b`) produced an infinite, mutually-referential tree that **hangs ECharts treemap/sunburst** — only the self-parent case was guarded. Added a `leadsTo` back-edge check: a link that would close a cycle breaks (the node becomes a root) so the output is always a finite forest. Tests: two-node mutual cycle (both roots) + longer ring (the non-cycle node attaches under its parent; the ring nodes stay roots) — covers both `leadsTo` branches.
- **KDE Silverman used the POPULATION sd (biased).** `populationStd` (÷n) → `sampleStd` (÷(n−1)), matching the canonical normal-reference rule (R `bw.nrd`, scipy/statsmodels). Reference tests recomputed against the sample sd (σ̂ = √2 for `[0,2]`).
- **`quantiles([])` returned a NaN summary** (percentile arithmetic on an empty array). Added an all-zero guard for empty / all-non-finite input, with tests.
- **`candlestick` hardening:** empty-state guard (`validRows` = rows with all-finite OHLC; `isEmpty` → `'No OHLC rows to chart'`); up/down candles now themed from `theme.colorScale` via `categoricalColor` (`color`/`color0`/`borderColor`/`borderColor0`) instead of ECharts defaults; non-finite OHLC rows dropped from both candles and the date axis. Tests: non-finite drop, themed colors, empty render.
- **`volume` hardening:** empty-state guard (`validRows` = finite-volume rows → `'No volume to chart'`); non-finite-volume rows dropped from bars + axis. Tests: non-finite drop, empty render.
- **`funnel` empty message:** added `emptyMessage()` `'No values to chart'` (was inheriting the generic default); funnel tests assert the chart-specific message.
- **Suggester alignment:** `ecdf` + `kde` gained `category_numeric` in `compatibleShapes`, so the common `category + numeric` dataset surfaces them (matching M2's detector relaxation). Registration tests + a wave-2 `m3-chart-suggestions` block now pin the ranked output per shape (`single_numeric → box_plot/ecdf/kde`, `ohlcv → candlestick/volume`, `category_numeric → funnel/lollipop`, `source_target_value → sankey`, `hierarchy → treemap/sunburst`).
- **Noted, not fixed (out of scope):** the KDE x-grid spans `[min,max]`, so with the Silverman default `h` the genuine tail mass beyond the data range isn't plotted (defensible; grid-padding is a wave-3+ enhancement); `'numeric'` in chart `acceptedTypes` remains dead (the detector emits `integer`/`float`, never bare `numeric`) — pre-existing, tracked. `box_plot`'s optional `group` picker was closed later in M4 analysis-loop slice 2.

### 2026-06-03 — M3 wave 3: statistical family + everyday remainder + group-by aggregation

**Chart count 25 → 43.** A producer workflow built a reference-validated compute layer (barrier) then fanned out 18 ECharts charts on it; integrated to 100% coverage, then a second adversarial-review workflow scrutinized everything. typecheck/lint clean, **683 tests / 100% coverage**, build green.

- **Compute / transform infra** (each reference-validated, no-mock-math): `rocCurve` (ROC + trapezoidal AUC), `prCurve` (PR + average precision), `calibrationCurve` (reliability bins), `normalQuantile` (Acklam probit) + `qqPoints`, `histogramBins` (shared equal-width binning — `histogram` was refactored onto it), `groupByAggregate` (sum/mean/count/min/max/median group-by), plus shared `isPositiveLabel`, `reduceFiniteValues`, and `alignedScores` helpers.
- **Charts (18):** statistical `error_bar`/`residual_plot`/`actual_vs_predicted`/`roc_curve`/`pr_curve`/`calibration_curve`/`qq_plot`/`feature_importance`; distribution `frequency_polygon`; categorical `pareto`/`percent_stacked_bar`; time-series `calendar_heatmap`/`streamgraph`; matrix `annotated_heatmap`; hierarchical `tree`; network-flow `force_directed_graph`; finance `ohlc`; specialized `gauge`. All 9 affected family barrels wired (statistical + specialized populated for the first time); each is suggester-pinned per shape in `m3-chart-suggestions.test.ts`.
- **Group-by aggregation wired:** `bar` and `horizontal_bar` now aggregate by category via `groupByAggregate('sum')` — long-form data renders one bar per category (not one per raw row, the wave-1 bug) and non-finite values are dropped (they previously cast `unknown[]` straight to `number[]`).

Adversarial multi-agent review (36 agents; 32 raised → 22 confirmed → ~13 distinct, all actioned):
- **ROC/PR AUC/AP were order-dependent for TIED scores (high).** The per-row threshold sweep gave AUC 0/1 (instead of 0.5) for all-tied input purely from row order. Both now collapse tied scores into one threshold step; `prCurve` AP switched to the tie-stable recall-delta estimator Σ(R_k−R_{k−1})·P_k. Regression tests pin AUC/AP 0.5 for tied input.
- **`pr_curve` score coercion (high).** Used `Number(v)` (turns `null`/`''`/`false` into a finite 0; numeric strings survive) and its empty-guard disagreed with its render path. Now shares `alignedScores` (`typeof v === 'number' ? v : NaN`, index-aligned with labels) with `roc_curve`/`calibration_curve`.
- **`bar`/`horizontal_bar` non-finite (high)** — fixed by the aggregation wiring above (resolves the dead-code finding on `groupByAggregate` too).
- **`isPositiveLabel` triplicated + divergent (med):** `rocCurve` was case-sensitive while `prCurve`/`calibrationCurve` trimmed+lowercased, so `'TRUE'` classified differently per chart. Extracted one shared `isPositiveLabel` (trim + case-insensitive).
- **`pareto` divide-by-zero (med):** all-zero/negative columns produced NaN/Infinity cumulative lines. Now drops non-positive values (Pareto magnitudes are non-negative) → total > 0 guaranteed, all-non-positive shows the empty state.
- **`calendar_heatmap` off-by-one-day (med):** local-timezone getters on UTC-parsed ISO dates shifted cells a day west of UTC. Switched to UTC getters.
- **`gauge` stack-overflow (med):** `Math.max(...values)` overflows on large columns. Now uses `reduceFiniteValues` (reduce-based), which also de-duplicates gauge's hand-rolled aggregator and types the op.
- **`histogramBins` silent data loss (med):** `binCount=0` bypassed the `||1` guard (Infinity is truthy). Clamped to ≥1.
- **Consolidations:** `histogram` refactored onto `histogramBins`; `groupByAggregate` min/max switched off the spread; `alignedScores`/`isPositiveLabel`/`reduceFiniteValues` extracted to single sources of truth.
- **Refuted (10, correctly):** tooltip-label polish (Phase-3, intended convention), `two_numeric` on the classifier charts (the detector genuinely emits it for score+0/1-label), intended time-series shape scoping, and several cosmetic spread-vs-index / wording nits.
- **Noted, not fixed (deliberate follow-ups):** aggregation not yet extended to `pie`/`donut`/`lollipop`/`pareto` (they already drop non-finite; aggregating repeated keys there is an enhancement, not a bug) — tracked for a focused pass; the `gauge` aggregate-op `select` still isn't membership-validated by `resolveOptions` (guarded locally instead).

### 2026-06-03 — Gate 3: Playwright visual-regression harness

The "renders correctly in a real browser" gate that jsdom unit tests structurally cannot provide (they mock canvas/WebGL). Built, verified (43/43 charts non-blank + deterministic screenshot baselines, regenerated and re-checked clean across multiple Docker runs), and CI-wired. **714 vitest tests / 100% coverage**, typecheck/lint/build green. **All work this session is uncommitted (git is the user's).**

- **Harness** (`tests/e2e/charts.spec.ts` + `playwright.config.ts`): drives the REAL UI per chart (load a sample → "Show all charts" → click `[data-chart-type]` → wait for ChartArea auto-assign + canvas), then asserts BOTH a non-blank canvas (reads pixels in-page; WebGL-safe for future deck.gl) AND `toHaveScreenshot`. Single chromium project; baselines keyed by chart name only (always run in the pinned Linux image). `force_directed_graph` is floor-only (no screenshot) — its ECharts force layout is `Math.random()`-seeded, so no stable baseline exists.
- **Determinism:** 11 seeded (`mulberry32`) sample generators in `src/data/sample-data.ts` (data no longer varies run-to-run — required for stable baselines); `window.__E2E__` flag read by `EChartsBaseRenderer` to set `animation: false` (Playwright's `animations:'disabled'` does NOT touch ECharts' canvas rAF loop); `maxDiffPixelRatio: 0.01` + `threshold: 0.2`.
- **Plumbing:** `run_e2e.{sh,bat}` (Docker wrappers, check / `update` modes, `mcr.microsoft.com/playwright:v1.60.0-noble` pinned to match `@playwright/test`); a `Visual Regression (Playwright)` CI job in the same image; `data-sample`/`data-chart-type`/`data-testid="chart-render"`(+`data-chart-active`/`data-chart-unfilled`) test hooks; a vitest drift guard (`tests/unit/charts/e2e-coverage.test.ts`) failing if any registered chart lacks a mapping; `tests/e2e/__screenshots__/` baselines + `playwright-report/`/`test-results/` gitignored.

Adversarial multi-agent review of the harness (25 agents; 21 raised → 13 confirmed, all actioned — the gate caught real chart bugs my spot-check missed):
- **treemap/sunburst rendered collapsed** (single zero-value root) → gave hierarchy-sample parents their summed child values so the area/radius charts partition correctly.
- **pie/donut/lollipop/pareto showed one slice/stem/bar per raw row** (16 duplicate-label slices for the sales sample) → routed through a new `aggregatedCategoryValues` (layers grouping over `finiteCategoryValues`), matching `bar`. Completes the wave-3 aggregation rollout.
- **ROC/PR AUC/AP were order-dependent for tied scores** → collapse tied scores into one threshold step; PR uses the recall-delta estimator. **`pr_curve`'s `Number(v)`** turned null/''/false into a finite 0 → shared `alignedScores` (`typeof v==='number'?v:NaN`) across roc/pr/calibration. **`isPositiveLabel`** extracted (was triplicated + divergent). **`calendar_heatmap`** UTC date getters (was shifting a day west of UTC). **`gauge`** `Math.max(...spread)` → `reduceFiniteValues`. **`histogramBins`** clamps `binCount<1`. **`@playwright/test`** pinned exact to the image tag.
- **Refuted (correctly):** the non-blank check being "weak" (the screenshot is the fidelity gate), the showAll race (React 19 flushes discrete events synchronously), the missing-baseline silent-pass (Playwright hard-fails on missing snapshots), and several footgun/nice-to-haves.

### 2026-06-03 — Gate 3 cosmetic fixes + Windows visual wrapper

- Fixed the `gauge` detail precision issue by adding an explicit two-decimal ECharts `detail.formatter`, with a unit assertion for the full-precision artifact case.
- Fixed legend/x-axis overlap on `grouped_bar`, `stacked_bar`, `percent_stacked_bar`, `multi_line`, `stacked_area`, and `streamgraph` by keeping the legend at the bottom and reserving bottom plot space (`grid.bottom` or `singleAxis.bottom`) instead of relying on ECharts' `top`/`bottom:'auto'` merge behavior.
- Regenerated the affected visual baselines and verified Gate 3 in Docker check mode: **43/43 Playwright charts passed**.
- Rewrote `run_e2e.bat` as an ASCII, non-interactive Windows wrapper and verified it runs the pinned Docker visual gate successfully.
- Ran `npm ci` on Windows and `git rm -r --cached node_modules dist` to untrack the pre-existing generated artifacts while leaving them on disk.

### 2026-06-03 — M3 wave 4 tranche 1: finance breadth

**Chart count 43 → 48.** Added 5 ECharts-native finance charts: `heikin_ashi`, `price_volume`, `drawdown`, `equity_curve`, and `return_series_line`.

- `heikin_ashi` transforms OHLC rows into Heikin-Ashi candles and drops non-finite OHLC rows.
- `price_volume` renders aligned candlestick and volume panels from OHLCV rows.
- `drawdown` computes percentage drawdown from the running equity peak.
- `equity_curve` and `return_series_line` render finite time/value points with empty-state guards.
- Wired the finance family barrel and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **740 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run build` green, and `run_e2e.bat` green with **48/48 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 2: categorical breadth

**Chart count 48 → 52.** Added 4 ECharts-native categorical charts: `cleveland_dot`, `dumbbell`, `slope`, and `waffle`.

- `cleveland_dot` renders aggregated category/value pairs as a horizontal dot plot.
- `dumbbell` renders finite category/value-a/value-b pairs with themed connector lines and paired endpoints.
- `slope` renders finite label/start/end comparisons as two-point slope lines.
- `waffle` renders positive category/value proportions as a deterministic 10×10 grid.
- Wired the categorical family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 4 new visual baselines.
- Verification: **756 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run build` green, and `run_e2e.bat` green with **52/52 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 3: statistical breadth

**Chart count 52 → 57.** Added 5 ECharts-native statistical/model-evaluation charts: `mean_ci_band`, `forest_plot`, `bland_altman`, `lift_chart`, and `gain_chart`.

- `mean_ci_band` renders finite x/mean/lower/upper rows as a mean line with a confidence interval band.
- `forest_plot` renders finite label/estimate/lower/upper rows as horizontal interval lines with estimate markers.
- `bland_altman` renders paired measurements as mean-vs-difference points with bias and limits-of-agreement reference lines.
- `lift_chart` and `gain_chart` render sorted finite x/value pairs with baseline reference lines.
- Wired the statistical family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **775 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run build` green, and `run_e2e.bat` green with **57/57 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 4: relationships breadth

**Chart count 57 → 62.** Added 5 ECharts-native relationships charts: `colored_scatter`, `regression_plot`, `polar_scatter`, `polar_line`, and `ternary`.

- `colored_scatter` groups finite x/y points into one themed scatter series per category.
- `regression_plot` renders finite x/y observations with an ordinary least-squares trend line, including a zero-x-variance fallback.
- `polar_scatter` and `polar_line` render finite radius/angle pairs in ECharts polar coordinates; `polar_line` sorts by angle before connecting points.
- `ternary` projects positive finite compositional triples into an equilateral triangle with a themed boundary.
- Wired the relationships family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **793 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run build` green, and `run_e2e.bat` green with **62/62 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 5: distribution breadth

**Chart count 62 → 67.** Added 5 ECharts-native distribution charts: `rug_plot`, `strip_plot`, `dot_plot`, `violin_plot`, and `ridgeline_plot`.

- `rug_plot` renders finite numeric values as compact axis ticks for dense one-dimensional distributions.
- `strip_plot` and `dot_plot` render grouped finite numeric points with first-seen group ordering and themed scatter marks.
- `violin_plot` uses the reference-validated `kernelDensity` helper to render mirrored density outlines by group.
- `ridgeline_plot` stacks per-group kernel-density ridges with themed area fills.
- Wired the distribution family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **817 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run build` green, and `run_e2e.bat` green with **67/67 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 6: time-series breadth

**Chart count 67 → 72.** Added 5 ECharts-native time-series charts: `percent_stacked_area`, `sparkline`, `run_chart`, `control_chart`, and `fan_chart`.

- `percent_stacked_area` pivots long-form date/series/value rows and normalizes each time bucket to 100%.
- `sparkline` renders a compact finite-value trend with hidden axes for dense UI contexts.
- `run_chart` renders finite process values with a mean reference line.
- `control_chart` renders finite process values with upper/lower control-limit lines.
- `fan_chart` renders forecast quantile lines (`p10`/`p25`/`p50`/`p75`/`p90`) over time.
- Added deterministic `process` and `forecast` sample datasets, wired the time-series family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **848 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **72/72 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 7: categorical completion

**Chart count 72 → 76.** Added the final 4 ECharts-native categorical charts: `mosaic_plot`, `marimekko`, `pictogram`, and `spine_plot`. The categorical family is now **15/15**.

- `mosaic_plot` renders positive two-category contingency counts as a nested treemap area plot.
- `marimekko` renders variable-width stacked rectangles from category/subgroup/value/width-metric rows.
- `pictogram` renders aggregated positive category magnitudes as repeated pictorial bars.
- `spine_plot` renders two-category count tables as variable-width, normalized stacked rectangles.
- Wired the categorical family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 4 new visual baselines.
- Verification: **868 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **76/76 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 8: distribution breadth

**Chart count 76 → 81.** Added 5 ECharts-native distribution charts: `beeswarm`, `joy_plot`, `pp_plot`, `probability_plot`, and `cumulative_distribution_plot`. The distribution family is now **15/21**.

- `beeswarm` renders grouped finite numeric values with deterministic local offsets so same-valued points separate without random jitter.
- `joy_plot` renders overlapping grouped kernel-density ridges using the shared `kernelDensity` helper and drops non-finite values before density generation.
- `pp_plot` compares empirical cumulative probabilities against normal-theory probabilities using the new `normalCdf` helper.
- `probability_plot` plots ordered sample values against normal-theory quantiles.
- `cumulative_distribution_plot` renders sorted finite values as an empirical cumulative distribution line.
- Wired the distribution family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **894 vitest tests / 100% coverage**, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **81/81 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 9: distribution breadth

**Chart count 81 → 86.** Added 5 ECharts-native distribution charts: `stem_and_leaf`, `raincloud_plot`, `sina_plot`, `letter_value_plot`, and `quantile_dot_plot`. The distribution family is now **20/21** by registered family; the remaining catalog item, `qq_plot`, is already implemented and Gate-3-covered under statistical.

- `stem_and_leaf` buckets rounded finite values by stem and exposes sorted leaves in the tooltip.
- `raincloud_plot` combines grouped density clouds, raw observations, and median summaries.
- `sina_plot` spreads grouped observations by local density using the shared `kernelDensity` helper.
- `letter_value_plot` renders progressively deeper grouped quantile boxes.
- `quantile_dot_plot` renders evenly spaced quantile dots for single or grouped distributions.
- Wired the distribution family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **918 vitest tests / 100% coverage**, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **86/86 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 10: time-series breadth

**Chart count 86 → 91.** Added 5 ECharts-native time-series charts: `horizon_chart`, `seasonal_subseries_plot`, `lag_plot`, `autocorrelation_plot`, and `forecast_cone`. The time-series family is now **17/22**.

- `horizon_chart` renders dense time/value data as folded magnitude bands.
- `seasonal_subseries_plot` groups dated values by UTC month for seasonal comparison.
- `lag_plot` renders current values against lag-one ordered values.
- `autocorrelation_plot` renders lag correlations from a new reference-tested `autocorrelation` stats helper.
- `forecast_cone` renders center/lower/upper forecast bounds over time; the forecast sample now exposes `center`/`lower`/`upper` aliases alongside the existing fan-chart quantiles.
- Wired the time-series family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **941 vitest tests / 100% coverage**, `npm run typecheck` clean, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **91/91 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 11: matrix/grid breadth

**Chart count 91 → 96.** Added 5 ECharts-native matrix/grid charts: `clustermap`, `confusion_matrix`, `calendar_matrix`, `tile_map`, and `quilt_plot`. The matrix family is now **7/10**.

- `clustermap` renders row/column/value heatmaps ordered by descending mean intensity.
- `confusion_matrix` renders actual-vs-predicted count cells with class labels on both axes.
- `calendar_matrix` maps UTC dates to week-by-week weekday cells from finite date/value rows.
- `tile_map` and `quilt_plot` render categorical row/column/value grids with themed heatmap encodings.
- Added shared `matrixGrid` helpers for finite cell extraction and deterministic row/column reordering.
- Wired the matrix family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **968 vitest tests / 100% coverage**, `npm run typecheck` clean, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **96/96 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 12: specialized breadth

**Chart count 96 → 101.** Added 5 ECharts-native specialized charts: `kpi_card`, `bullet_chart`, `funnel_area`, `pyramid_chart`, and `population_pyramid`. The specialized family is now **6/17**.

- `kpi_card` renders the first finite metric/value pair as a themed KPI display.
- `bullet_chart` renders actual values against targets and qualitative ranges.
- `funnel_area` renders funnel stages as area-scaled ECharts funnel slices.
- `pyramid_chart` renders paired category values as mirrored horizontal bars.
- `population_pyramid` pivots age-band/segment/count rows into mirrored population bars and normalizes missing cells to zero.
- Added deterministic `kpi` and `demographics` samples, wired the specialized family barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1001 vitest tests / 100% coverage**, `npm run typecheck` clean, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **101/101 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 13: time-series completion

**Chart count 101 → 106.** Added the final 5 ECharts-native time-series charts: `partial_autocorrelation_plot`, `event_timeline`, `gantt_chart`, `swimlane_timeline`, and `range_bar`. The time-series family is now **22/22 complete**.

- `partial_autocorrelation_plot` renders lag-wise PACF bars from a new reference-tested `partialAutocorrelation` helper.
- `event_timeline` renders labeled events along a time/category axis.
- `gantt_chart`, `swimlane_timeline`, and `range_bar` render start/end intervals as ECharts custom series with themed bars and empty-state guards.
- Added deterministic `timeline` sample data, wired the time-series barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1027 vitest tests / 100% coverage**, `npm run typecheck` clean, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **106/106 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 14: specialized analytics breadth

**Chart count 106 → 111.** Added 5 ECharts-native specialized analytics charts: `topic_term_bubble`, `cohort_retention_heatmap`, `retention_curve`, `conversion_path_chart`, and `bump_chart`. The specialized family is now **11/17**.

- `topic_term_bubble` renders topic/term/weight rows as a categorical bubble grid with scaled symbols.
- `cohort_retention_heatmap` renders cohort/period/retention rows as a themed heatmap with percentage labels.
- `retention_curve` averages duplicate period rows into a smooth retention line.
- `conversion_path_chart` renders source/target/count transitions as an ECharts Sankey path chart.
- `bump_chart` renders ranked entities over time with rank one at the top.
- Added deterministic `topics`, `cohort`, `conversionPath`, and `ranking` sample datasets, wired the specialized barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1062 vitest tests / 100% coverage**, `npm run typecheck` clean, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **111/111 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 15: finance/statistical breadth

**Chart count 111 → 117.** Added 6 ECharts-native finance/statistical charts: `rolling_volatility_plot`, `order_book_depth_chart`, `yield_curve`, `candlestick_heatmap_by_hour_day`, `survival_curve`, and `cumulative_hazard_plot`. Finance is now **12/15** and statistical is now **15/19**.

- `rolling_volatility_plot` renders finite date/rolling-volatility points as a percent line/area; the stock sample now exposes deterministic `rolling_vol`.
- `order_book_depth_chart` renders sorted price levels as cumulative bid/ask depth curves.
- `yield_curve` parses numeric or labeled maturities and renders sorted maturity/yield points.
- `candlestick_heatmap_by_hour_day` renders weekday/hour/value buckets as a themed heatmap.
- `survival_curve` and `cumulative_hazard_plot` use a new reference-tested `survivalCurve` helper for Kaplan-Meier survival and Nelson-Aalen cumulative hazard.
- Added deterministic `orderBook`, `yieldCurve`, `tradingBuckets`, and `survival` samples, wired the finance/statistical barrels, suggestion coverage, and Gate-3 chart/sample mapping; generated 6 new visual baselines.
- Verification: **1101 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **117/117 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 16: relationships breadth

**Chart count 117 → 123.** Added 6 ECharts-native relationships charts: `loess_smoother_plot`, `faceted_scatter`, `pca_scatter`, `t_sne_plot`, `umap_plot`, and `radar`. Relationships is now **13/26**.

- `loess_smoother_plot` renders sorted finite x/y observations with a deterministic local smoother line.
- `faceted_scatter` splits finite x/y points into one small-multiple grid per facet.
- `pca_scatter`, `t_sne_plot`, and `umap_plot` render finite embedding coordinates with themed scatter marks.
- `radar` renders metric/value rows as an ECharts radar profile with themed indicators and area fill.
- Added deterministic `embedding` sample data, wired the relationships barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 6 new visual baselines.
- Verification: **1122 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **123/123 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 17: hierarchical completion

**Chart count 123 → 128.** Added the final 5 ECharts-native hierarchical charts: `icicle`, `dendrogram`, `radial_tree`, `circle_packing`, and `partition_chart`. Hierarchical is now **8/8 complete**.

- `icicle` uses a themed ECharts treemap view with shallow leaf focus and hierarchy-derived values.
- `partition_chart` uses a sunburst partition layout with explicit level radii and themed hierarchy styling.
- `circle_packing` flattens the hierarchy into a circular graph with value-scaled symbols and parent-child links.
- `radial_tree` and `dendrogram` render the same hierarchy through radial and orthogonal ECharts tree layouts.
- Wired the hierarchical barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1141 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **128/128 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 18: network-flow/composition breadth

**Chart count 128 → 133.** Added 5 ECharts-native network-flow/composition charts: `arc_diagram`, `chord_diagram`, `alluvial_diagram`, `waterfall_chart`, and `nested_donut`. Network-flow is now **7/10** and composition is now **3/10**.

- `arc_diagram` lays ordered source/target nodes along one axis and connects them with weighted curved graph edges.
- `chord_diagram` renders source/target/value flows as a circular ECharts graph with weighted chords.
- `alluvial_diagram` converts three-stage categorical path rows into adjacent aggregated Sankey links.
- `waterfall_chart` renders sequential positive/negative deltas with a transparent base and running-total line.
- `nested_donut` aggregates two categorical levels into inner/outer proportional donut rings.
- Added deterministic `journey` sample data, wired the network-flow/composition barrels, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1166 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **133/133 Playwright charts**.

### 2026-06-03 — M3 wave 4 tranche 19: finance completion

**Chart count 133 → 136.** Added the final 3 ECharts-native finance charts: `renko`, `kagi`, and `point_and_figure`. The finance family is now **15/15 complete**.

- `renko` converts finite close prices into adaptive price-movement bricks rendered as themed candlestick bricks.
- `kagi` renders reversal-based close-price segments with themed rising/falling line colors.
- `point_and_figure` converts finite close prices into X/O box columns rendered as themed scatter labels.
- Wired the finance barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 3 new visual baselines.
- Verification: **1187 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **136/136 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 20: statistical completion

**Chart count 136 → 140.** Added the final 4 ECharts-native statistical/model-explainability charts: `shap_summary_beeswarm`, `shap_dependence_plot`, `partial_dependence_plot`, and `ice_plot`. The statistical family is now **19/19 complete**.

- `shap_summary_beeswarm` orders features by mean absolute SHAP magnitude and renders deterministic swarm offsets for finite SHAP rows.
- `shap_dependence_plot` renders sorted feature-value versus SHAP-value scatter points.
- `partial_dependence_plot` averages duplicate feature values into a smooth predicted-response curve.
- `ice_plot` groups finite entity/feature/prediction rows into one sorted conditional-expectation line per entity.
- Added a deterministic `explainability` sample dataset, wired the statistical barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 4 new visual baselines.
- Verification: **1212 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **140/140 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 21: matrix completion

**Chart count 140 → 143.** Added the final 3 ECharts-native matrix charts: `correlation_matrix`, `distance_matrix_heatmap`, and `image_raster_plot`. The matrix family is now **10/10 complete**.

- `correlation_matrix` renders long-form row/column/correlation values as a labeled heatmap using the theme's diverging scale.
- `distance_matrix_heatmap` renders pairwise row/column distance values as a sequential heatmap with a zero floor.
- `image_raster_plot` renders row/column/intensity raster cells with inverted row ordering for image-like orientation.
- Wired the matrix barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 3 new visual baselines.
- Verification: **1228 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **143/143 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 22: specialized breadth

**Chart count 143 → 146.** Added 3 ECharts-native specialized charts: `word_cloud`, `sequence_diagram`, and `ranking_table_with_sparklines`. The specialized family is now **14/17**.

- `word_cloud` renders weighted terms as deterministic themed text graphics without adding a new dependency.
- `sequence_diagram` renders ordered actor-to-actor interactions as action-labeled lane links.
- `ranking_table_with_sparklines` renders latest entity ranks with compact rank-history sparklines in an ECharts graphic table.
- Added a deterministic `sequence` sample and `word` aliases in the topics sample, wired the specialized barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 3 new visual baselines.
- Verification: **1248 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **146/146 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 23: network-flow completion

**Chart count 146 → 149.** Added the final 3 ECharts-native network-flow charts: `network_graph`, `dependency_graph`, and `adjacency_matrix`. The network-flow family is now **10/10 complete**.

- `network_graph` renders directed weighted edges in a deterministic circular graph layout.
- `dependency_graph` infers dependency depth from source/target edges and renders fixed-position directed links.
- `adjacency_matrix` aggregates directed edge weights into a themed source-by-target heatmap.
- Wired the network-flow barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 3 new visual baselines.
- Verification: **1264 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **149/149 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 24: specialized completion

**Chart count 149 → 152.** Added the final 3 ECharts-native specialized charts: `table`, `small_multiples`, and `faceted_dashboard_grid`. The specialized family is now **17/17 complete**.

- `table` renders arbitrary rows and columns as a compact themed ECharts graphic table.
- `small_multiples` aggregates facet/category/value rows into repeated mini bar charts.
- `faceted_dashboard_grid` renders facet-level KPI cards with compact category breakdown bars.
- Wired the specialized barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 3 new visual baselines.
- Verification: **1273 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **152/152 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 25: relationships density/contour breadth

**Chart count 152 → 157.** Added 5 ECharts-native relationship charts: `joint_plot`, `hexbin_plot`, `two_d_density_plot`, `contour_plot`, and `filled_contour`. Relationships is now **18/26**.

- `joint_plot` renders finite x/y points with marginal x and y histograms.
- `hexbin_plot` bins finite x/y points into density-scaled hexagonal scatter markers.
- `two_d_density_plot` renders binned x/y density as a themed heatmap.
- `contour_plot` and `filled_contour` grid finite x/y/z triples into mean z bands using discrete and continuous diverging color encodings.
- Added shared `relationshipGrid` helpers for finite point extraction plus deterministic density/mean grid binning.
- Wired the relationships barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 5 new visual baselines.
- Verification: **1296 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **157/157 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 26: relationships multivariate breadth

**Chart count 157 → 164.** Added 7 ECharts-native relationship charts: `biplot`, `andrews_curves`, `radviz`, `parallel_coordinates`, `scatter_matrix`, `correlation_heatmap`, and `covariance_heatmap`. Relationships is now **25/26**.

- `biplot` renders finite PCA score points with themed loading vectors.
- `andrews_curves` transforms finite feature rows into multivariate Fourier curves.
- `radviz` projects normalized feature rows around deterministic feature anchors.
- `parallel_coordinates` renders finite feature rows across parallel numeric axes.
- `scatter_matrix` lays out the first three numeric features as a 3x3 matrix of pairwise scatter cells.
- `correlation_heatmap` and `covariance_heatmap` render feature association matrices with themed visual maps.
- Added shared `multivariate` ECharts helpers, wired the relationships barrel, suggestion coverage, and Gate-3 chart/sample mapping; generated 7 new visual baselines.
- Verification: **1314 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **164/164 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 27: composition completion

**Chart count 164 → 171.** Added 7 ECharts-native composition charts: `composition_stacked_bar`, `composition_percent_stacked_bar`, `composition_stacked_area`, `composition_percent_stacked_area`, `composition_treemap`, `composition_sunburst`, and `composition_waffle`. Composition is now **10/10 complete**.

- `composition_stacked_bar` and `composition_percent_stacked_bar` render long-form category/subgroup/value composition with stacked and 100%-normalized bars.
- `composition_stacked_area` and `composition_percent_stacked_area` render long-form time/subgroup/value composition with stacked and 100%-normalized area series.
- `composition_treemap` and `composition_sunburst` reuse the validated hierarchy builder for part-to-whole hierarchy views under composition-prefixed registry keys.
- `composition_waffle` renders aggregate category shares into a deterministic 10x10 pictorial grid.
- Used composition-prefixed registry keys for catalog concepts that overlap categorical/time-series/hierarchical chart names, keeping registry type IDs unique while completing the catalog family.
- Wired the composition barrel, suggestion coverage, deterministic `sales`/`stock`/`hierarchy` visual sample mappings, and 7 new Gate-3 baselines.
- Verification: **1330 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **171/171 Playwright charts**.

### 2026-06-04 — M3 wave 4 tranche 28: relationship completion

**Chart count 171 → 172.** Added `pair_plot`, completing relationships at **26/26**.

- `pair_plot` renders a 3x3 multivariate grid with per-feature histograms on the diagonal and pairwise scatter cells off diagonal.
- Wired the relationships barrel, suggestion coverage, deterministic `numeric` visual sample mapping, and a new Gate-3 baseline (`pair-plot.png`).
- Verification: **1331 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, `npm run build` green, and the pinned Docker Playwright gate green with **172/172 Playwright charts**.

### 2026-06-04 — M4 analysis-loop slice 1: usable data controls

Shipped the first M4 interaction slice without changing chart count (**172/193**).

- Data tab now includes a 5-row preview table, multi-dataset switcher, and reachable filter controls for add/toggle/remove/clear using the existing filter store.
- Layers tab can activate an existing layer, not only remove it.
- Samples menu now uses the existing Radix dropdown primitive for managed open/close behavior.
- Theme state can be set explicitly and persists through `localStorage` under `bi-theme`.
- Verification: **1340 vitest tests / 100% coverage**, `npx tsc --noEmit` clean, `npm run typecheck` clean, `npm run lint` clean, and `npm run build` green.

### Earlier (v0.3.0 — Full Alignment Pass)

- Enabled TypeScript `strict: true` in both `tsconfig.app.json` and `tsconfig.test.json` (zero cascading errors — codebase was already strict-safe)
- Fixed pre-existing `inferType` bug in `src/data/shape-detector.ts`: geo name pattern (`lat`/`lng`/`lon`/`longitude`) now takes precedence over numeric classification so geo columns with numeric values receive the `geo_point` type
- Split `src/components/chart-area/ChartArea.tsx` per "one concept per file": extracted `ColumnPicker.tsx` and `ChartCanvas.tsx` into their own files; `ChartArea` now only orchestrates
- Rewrote project `CLAUDE.md` with mandatory-re-read directive, explicit stack overrides (Zustand over Redux, ECharts+deck.gl+regl over Chart.js, npm over pnpm) each with reason citations, refreshed structure tree, testing conventions, CI summary, phase gates, and self-audit checklist extensions
- `.claude/settings.json` extended per global §8: added `PreToolUse` matcher blocking writes to `.env*`, `credentials.*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, and ssh keys; added `PreCompact` preservation brief; upgraded `PostToolUse` to emit `hookSpecificOutput.additionalContext` per docs
- Added 187 tests (191 total) covering: shape-detector (25), transforms (12), chart-suggester (21), loader (5), CSV/JSON parsers (8), sample-data (3), all 5 Zustand stores (25), chart registry (9), FAMILY_META (1), ECharts base renderer (2), deck.gl cleanup (1), histogram/line/scatter builders (12), lib/color (8), theme tokens/context/provider (7), ErrorBoundary (4), ColumnPicker (2), ChartCanvas (2), ChartArea (5), Toolbar (12), Sidebar (6), ChartPicker (5), ChartOptionsPanel (7)
- **Coverage gate set to 100%** in `vitest.config.ts` thresholds block — `test` stage in CI fails on drop. Achieved 100% stmts / 100% branches / 100% funcs / 100% lines on `src/**`
- Three `/* v8 ignore next */` pragmas added in source for genuinely unreachable defensive branches: `loader.ts` split-fallback, `sample-data.ts` empty-rows guard, `ChartArea.tsx` optional column default — each annotated with why
- ESLint config extended: `globalIgnores` now covers `coverage/`, `.claude/`, `node_modules/`; `argsIgnorePattern`/`varsIgnorePattern` set to `^_` for the underscore-prefix convention

## v0.2.0 — Phase 0 scaffolding

- Test infrastructure: Vitest + @testing-library/react + jsdom, `tests/unit/*` layout, v8 coverage reporters (text/cobertura/html)
- Added `tsconfig.test.json` referenced from root `tsconfig.json`
- `package.json` scripts: `test`, `test:watch`, `test:coverage`, `typecheck`
- Two smoke tests: `tests/unit/data/shape-detector.test.ts` (3 cases), `tests/unit/charts/deckgl-renderer.test.tsx` (deck.finalize on unmount)
- GitHub Actions CI: `.github/workflows/ci.yml` — lint, typecheck, test+coverage, build, docker
- deck.gl WebGL leak fixed: `DeckGLBaseRenderer` renders through a `DeckGLChart` FC that holds a `DeckGLRef` and calls `deck.finalize()` in the `useEffect` cleanup path
- `ChartArea.tsx` memoizes the renderer by chart type and keys the chart canvas div on `chartType` so switches force unmount and fire cleanup
- Launchers: `bi_service.sh` and `bi_service.bat` gained `[r]` restart option (unlimited stop→rebuild→relaunch cycles) plus a "Service running at $URL" block, per global CLAUDE.md §4
- Added `.env.example` (documents `BI_PORT`)
- `.gitignore` now excludes `coverage/`, `.vitest-cache/`, `junit*.xml`

## v0.1.0 — Architecture + Initial Charts

- Complete chart registry and renderer architecture (ECharts, deck.gl, regl, Canvas2D base classes)
- Data pipeline: file upload, CSV/JSON parsing, column analysis, shape detection, chart suggestion
- Zustand + Immer state management (dataset, chart, UI, filter, annotation stores)
- Dark/light theming with Tailwind CSS v4 + Radix UI primitives
- 3 chart types implemented: histogram, line, scatter
- Sidebar with chart picker (family browser + chart type list)
- Docker containerization with nginx serving
- Launcher scripts (`bi_service.sh`, `bi_service.bat`)

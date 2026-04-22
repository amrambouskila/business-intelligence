# Status — Business Intelligence

## Current State

Phase 2 — Chart Coverage. **3 of 193** target chart types implemented (histogram, line, scatter). Foundation is hardened: 100% test coverage across `src/**`, GitHub Actions CI enforcing the gate, TS strict mode on, deck.gl WebGL cleanup verified via unit test, launchers with `[k]/[q]/[v]/[r]`, `.env.example` in place.

## What's Built

- **Chart Registry**: `ChartRegistry` singleton with register/get/getByFamily/suggestForShape/all/families/count, duplicate-register throws
- **Renderer Architecture**: 2 live backends (ECharts, deck.gl with `DeckGLChart` FC + `finalize()` on unmount), 2 slots reserved (regl, Canvas2D)
- **Data Pipeline**: file upload → PapaParse/JSON → `analyzeColumns` → `detectShape` → `suggestCharts`
- **State Management**: Zustand stores — dataset, chart, ui, filter, annotation
- **Theming**: dark/light tokens through `ThemeProvider` (`theme-provider.tsx`) + `useTheme` hook (`theme-context.ts`)
- **Testing**: Vitest + @testing-library/react + jsdom. **191 tests, 100% stmts / 100% branches / 100% funcs / 100% lines** on `src/**` (excluding `main.tsx`, `App.tsx`, `src/types/**`, `src/**/index.ts` barrels, `*.css`)
- **CI**: `.github/workflows/ci.yml` — lint → typecheck → test+coverage → build → docker (staging/main only). Coverage gate = 100% in `vitest.config.ts`; test stage fails on drop.
- **Docker**: multi-stage `Dockerfile` (node:20-alpine → nginx:alpine), single-service `docker-compose.yml`
- **Launchers**: `bi_service.sh` / `bi_service.bat` with banner + URL block + `[k]/[q]/[v]/[r]` loop
- **Env template**: `.env.example` documents `BI_PORT`
- **`.claude/` wiring**: `SessionStart` / `PreToolUse` (blocks writes to `.env*`, `credentials.*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, ssh keys) / `PostToolUse` (state-sensitive + renderer warnings) / `PreCompact` (preservation brief) / `Stop` (uncommitted-changes + memory review)

## Implemented Charts

1. `distribution/histogram.ts` — ECharts
2. `time-series/line.ts` — ECharts
3. `relationships/scatter.ts` — ECharts

## Recent Changes (v0.3.0 — Full Alignment Pass)

- Enabled TypeScript `strict: true` across `tsconfig.app.json` and `tsconfig.test.json` — zero cascading errors
- Fixed a latent bug in `src/data/shape-detector.ts`: `inferType` now checks the geo name pattern *before* numeric so `lat`/`lng`/`lon` columns with numeric values are correctly typed as `geo_point` (previously shadowed to `float`)
- Split `ChartArea.tsx` per "one concept per file": extracted `ColumnPicker` and `ChartCanvas` into their own files
- Rewrote project `CLAUDE.md` with the mandatory-re-read directive, explicit stack overrides (Zustand vs Redux, ECharts vs Chart.js, npm vs pnpm) justified against global `CLAUDE.md` §3, and refreshed structure/testing/CI sections
- `.claude/settings.json` gained `PreToolUse` secrets blocker and `PreCompact` preservation brief per global §8
- **Tests:** added 187 tests across data utilities, stores, registry, renderers, chart family implementations, theme, `lib`, and every component. Total: **191 passing.**
- **Coverage gate:** `vitest.config.ts` thresholds set to 100% on statements/branches/functions/lines. `/* v8 ignore next */` pragmas used sparingly on three genuinely unreachable branches (a string-split fallback, an empty-rows guard, and an optional-column default), each with a justifying comment.
- ESLint config extended: ignore `coverage/`, `.claude/`, respect `_`-prefix convention for unused-vars.

## Known Gaps / Caveats

- **Only 3 of 193 charts implemented** — Phase 2 is just beginning. Architecture is frozen; additions are purely additive.
- **Windows launcher is untested** from this macOS session. `bi_service.bat` is written but should be exercised on Windows before release.
- **Deck.gl end-to-end leak verification is unit-level only.** No registered chart uses the deck.gl backend yet — cleanup is covered by `tests/unit/charts/deckgl-renderer.test.tsx` which mocks `@deck.gl/react` to assert `finalize()` fires on unmount. Real-world verification lands with the first deck.gl-backed chart (geographic or 3D family).
- **Build emits a chunk-size warning** (ECharts + deck.gl are heavy). Code-splitting / lazy-loading of chart families is deferred to Phase 2's later sub-phases.
- **npm vs pnpm override** (see CLAUDE.md §3) — acceptable for Phase 1–3; revisit when backend lands in Phase 4.

## What's Next

- Expand chart families — use `/scaffold-charts` to batch-add chart types per family
- Start with distribution (KDE, violin, box plot) and categorical (bar, grouped bar, Pareto) — highest user value per chart
- Every new chart ships with a test; 100% coverage gate enforces this
- Run `/chart-status` for a family-by-family progress breakdown

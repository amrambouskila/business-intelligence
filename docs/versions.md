# Versions — Business Intelligence

## v0.3.0 — Full alignment with global CLAUDE.md

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
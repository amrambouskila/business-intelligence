# AGENTS.md — Project Guide for Business Intelligence

> **MANDATORY WORKFLOW: READ THIS ENTIRE FILE BEFORE EVERY CHANGE.** Every time. No skimming, no assuming prior-session context carries over — it does not.
>
> **Why:** This project spans multiple sessions and months of development. Skipping the re-read produces decisions that contradict the architecture, duplicate existing patterns, break data contracts, or introduce tech debt that compounds.
>
> **The workflow, every time:**
> 1. Read this entire file in full.
> 2. Read [`docs/BUSINESS_INTELLIGENCE_MASTER_PLAN.md`](docs/BUSINESS_INTELLIGENCE_MASTER_PLAN.md) — authoritative goals, phases, architecture decisions, gate criteria.
> 3. Read [`docs/status.md`](docs/status.md) — live state / what was just built.
> 4. Read [`docs/versions.md`](docs/versions.md) — recent version history.
> 5. Read [`CHARTS.md`](CHARTS.md) if the task touches a chart type.
> 6. Read the source files you plan to modify — understand existing patterns first.
> 7. Then implement, following the rules and contracts defined here.

---

## 0. Critical Context

The ultimate universal charting and data analysis platform — a single tool that can visualize and analyze any dataset from any domain. Built as a reusable frontend-only app that every future project of mine can embed or import instead of rebuilding a chart layer from scratch.

**What this project is NOT:**
- Not a BI dashboard product (no auth, no multi-tenant, no scheduled reports).
- Not a data warehouse or ETL tool — data comes in as files.
- Not a notebook environment.
- Not backed by a server in Phase 1–3. Pure client-side app.

**Current phase: Phase 2 — Chart Coverage.** **193 of 193** chart types implemented (M0–M3 waves 1–3 + Gate 3 visual-regression harness + M3 wave 4 finance/categorical/statistical/relationships/distribution/time-series/matrix/specialized/hierarchical/network-flow/composition tranches; all 13 chart families are complete). M4 slices 1–13 and M5 renderer-infrastructure/geographic/3D slices 1–6 are also shipped (data preview/switching, reachable filters with verified chart coupling, dataset-scoped row annotations, filtered CSV + chart-spec JSON export, active chart PNG export, SVG export where a renderer emits SVG, command palette with keyboard shortcut, optional column role assignment/removal, formatted numeric and locale/date import normalization, chart option select validation, UI/chart token cleanup, Zustand immer middleware adoption, npm audit cleanup, layer activation, Radix samples menu, persisted theme, live Canvas2D and regl base renderers + wrappers, deck.gl Map/Orbit/Orthographic view selection, shared geographic deck.gl helpers, all fourteen geographic deck.gl charts, and all six 3D OrbitView charts). **[`docs/status.md`](docs/status.md) is the authoritative live count + current state — read it.** Phase 2 chart coverage is locally complete; after any chart-related change, every chart still needs unit coverage and a Gate-3 visual baseline.

**Do NOT in this phase:**
- Introduce a backend (Phase 4).
- Add interaction features (filters UI, annotations UI, export) — Phase 3.
- Change renderer base classes or data contracts without a master-plan update.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Path | `/Users/amrambouskila/IMPORTANT/Projects/business-intelligence/` |
| Parent structure | Standalone (not a monorepo member) |
| Master plan | [`docs/BUSINESS_INTELLIGENCE_MASTER_PLAN.md`](docs/BUSINESS_INTELLIGENCE_MASTER_PLAN.md) |
| Chart catalog | [`CHARTS.md`](CHARTS.md) — 193 types across 13 families |
| Git remote | GitHub (public) — CI via GitHub Actions per global AGENTS.md §5 |

---

## 2. Tech Stack

- **React 19 + TypeScript (strict mode on)** — UI framework
- **Vite 8** — build tool and dev server
- **Apache ECharts 6** — Canvas/WebGL chart rendering (~120 chart types)
- **deck.gl 9** — WebGL-native rendering for large datasets, geo, 3D (~40 chart types)
- **regl** — custom WebGL shaders for specialized charts
- **Zustand + Immer** — reactive state management (see §3 overrides)
- **Tailwind CSS v4** — utility-first styling
- **Radix UI** — accessible UI primitives
- **PapaParse** — CSV parsing
- **D3** — computation/layouts (force, hierarchy), rendered into WebGL/Canvas
- **Vitest + @testing-library/react + jsdom** — tests
- **@vitest/coverage-v8** — coverage
- **ESLint (typescript-eslint + react-hooks + react-refresh)** — lint
- **Docker + nginx** — containerized production deployment
- **GitHub Actions** — CI/CD

## 3. Stack Overrides from Global AGENTS.md

These diverge from global §5 and are deliberate. Do not "revert" them without a master-plan update.

| Global default | Project choice | Reason |
|---|---|---|
| **Redux** for app state | **Zustand + Immer** | Master plan §2: Zustand's minimal boilerplate is a better fit for a frontend-only reactive chart app. Each store owns one concern; `immer` handles nested draft updates. Redux's thunks/middleware give no benefit without a backend. |
| **Chart.js** as default 2D charting | **Apache ECharts + deck.gl + regl + Canvas2D** | The whole product is charting. ECharts covers ~120 types natively. deck.gl handles WebGL-scale and 3D. Chart.js's ~15 types would bottleneck the project. See master plan §2 "Architectural decisions". |
| **pnpm** as package manager | **npm** | Project scaffolded with npm; `package-lock.json`, the multi-stage `Dockerfile` (`npm ci`), the GitHub Actions workflow, and the launcher scripts all assume npm. A pnpm migration would be coordinated change across Dockerfile + CI + lockfile with no behavioral gain for a single-service frontend. Tracked as a future refactor when backend lands in Phase 4. |

All other global rules apply in full — no silent substitution.

---

## 4. Project Structure

```
business-intelligence/
├── AGENTS.md                            # This file
├── CHARTS.md                            # Chart catalog (193 types, 13 families)
├── README.md                            # Human-facing overview + architecture diagram
├── .env.example                         # Env template (BI_PORT)
├── docs/
│   ├── BUSINESS_INTELLIGENCE_MASTER_PLAN.md  # Authoritative master plan
│   ├── status.md                        # Current state snapshot
│   └── versions.md                      # Semver changelog
├── .codex/
│   ├── settings.json                    # SessionStart / PreToolUse / PostToolUse / PreCompact / Stop hooks
│   ├── commands/                        # /new-chart, /scaffold-charts, /review, /pre-commit, /validate-registry, /add-family
│   └── skills/                          # build-check, chart-status, scaffold-charts
├── .github/
│   └── workflows/
│       └── ci.yml                       # lint → typecheck → test+coverage → build → docker
├── docker-compose.yml                   # Single-service compose (nginx + built dist)
├── Dockerfile                           # Multi-stage: node:20-alpine build → nginx:alpine serve
├── nginx.conf                           # SPA routing config
├── bi_service.sh                        # Mac/Linux launcher with [k]/[q]/[v]/[r]
├── bi_service.bat                       # Windows launcher with [k]/[q]/[v]/[r]
├── package.json                         # npm scripts: dev, build, lint, typecheck, test, test:watch, test:coverage
├── package-lock.json
├── tsconfig.json                        # References tsconfig.app.json, tsconfig.node.json, tsconfig.test.json
├── tsconfig.app.json                    # App code (strict mode)
├── tsconfig.node.json                   # Build tool config (vite.config.ts)
├── tsconfig.test.json                   # Test code (src + tests)
├── vite.config.ts                       # Vite + React plugin + alias
├── vitest.config.ts                     # Vitest + jsdom + v8 coverage (thresholds below)
├── eslint.config.js                     # TS + React hooks + React refresh
├── tests/
│   ├── setup.ts                         # @testing-library/jest-dom + cleanup + ResizeObserver/canvas/WebGL mocks
│   └── unit/
│       ├── charts/                      # Renderer, registry, family implementation tests
│       ├── components/                  # Component rendering + interaction tests
│       ├── data/                        # shape-detector, transforms, loader, parsers, sample-data
│       ├── lib/                         # color utility tests
│       ├── stores/                      # All 5 Zustand stores
│       └── theme/                       # tokens, theme-context, theme-provider
└── src/
    ├── app/App.tsx                      # Root component
    ├── main.tsx                         # Entry point
    ├── index.css                        # Tailwind + CSS custom properties
    ├── charts/
    │   ├── registry.ts                  # ChartRegistry singleton
    │   ├── types.ts                     # ChartDefinition, ChartRenderer, ChartConfig, FAMILY_META
    │   ├── renderers/
    │   │   ├── echarts-renderer.tsx     # EChartsBaseRenderer (abstract)
    │   │   ├── deckgl-renderer.tsx      # DeckGLBaseRenderer (abstract)
    │   │   └── DeckGLChart.tsx          # FC wrapping <DeckGL> with finalize() on unmount
    │   └── families/
    │       ├── index.ts                 # Barrel — imports all family index.ts files
    │       ├── distribution/
    │       │   ├── index.ts             # import './histogram'
    │       │   └── histogram.ts
    │       ├── time-series/
    │       │   ├── index.ts
    │       │   └── line.ts
    │       ├── relationships/
    │       │   ├── index.ts
    │       │   └── scatter.ts
    │       └── {categorical, matrix, hierarchical, network-flow, geographic,
    │            finance, statistical, composition, specialized, three-d}/index.ts
    ├── data/
    │   ├── loader.ts                    # loadFile(File) → DataSet
    │   ├── shape-detector.ts            # analyzeColumns + detectShape
    │   ├── chart-suggester.ts           # scoreChart + suggestCharts (shape→ranked suggestions)
    │   ├── transforms.ts                # applyFilters + matchFilter
    │   ├── sample-data.ts               # Stock + numeric sample generators
    │   └── parsers/
    │       ├── csv-parser.ts            # parseCSV, parseCSVFile
    │       └── json-parser.ts           # parseJSON
    ├── stores/                          # Zustand stores: dataset, chart, ui, filter, annotation
    ├── components/
    │   ├── chart-area/
    │   │   ├── ChartArea.tsx            # Orchestrator
    │   │   ├── ColumnPicker.tsx         # Column <select> in the header
    │   │   └── ChartCanvas.tsx          # Renderer dispatch with per-chartType memo
    │   ├── sidebar/
    │   │   ├── Sidebar.tsx              # Tab host (also contains DataTab, LayersTab, StyleTab)
    │   │   ├── ChartPicker.tsx          # Family browser + chart type list
    │   │   └── ChartOptionsPanel.tsx    # Per-chart-type option controls
    │   ├── toolbar/
    │   │   └── Toolbar.tsx              # Upload, samples, theme toggle
    │   └── ui/
    │       └── ErrorBoundary.tsx        # Error boundary for chart area
    ├── theme/
    │   ├── tokens.ts                    # darkTokens + lightTokens
    │   ├── theme-context.ts             # ThemeContext + useTheme hook
    │   └── theme-provider.tsx           # ThemeProvider component only
    ├── lib/
    │   └── color.ts                     # formatBytes + formatNumber
    └── types/
        ├── data.ts                      # DataSet, DataView, ColumnMeta, ColumnType, DataShape, Filter
        └── common.ts                    # DeepPartial utility
```

---

## 5. Key Patterns

### Chart Registry
- `ChartRegistry` singleton in `src/charts/registry.ts`
- Each chart type is a `ChartDefinition` with metadata + `createRenderer()` factory
- Charts register via side-effect imports: each family's `index.ts` imports chart files
- `src/charts/families/index.ts` is the barrel that triggers all registrations
- Registry is indexed by family and by compatible data shape for fast lookup
- Duplicate registration throws — register exactly once per chart type

### Renderer Architecture
- `ChartRenderer` interface: `render(data, config, theme) → ReactElement`; optional `destroy?()`
- 4 backends, each chart picks one:
  - **EChartsBaseRenderer** — subclasses override `buildOption()`
  - **DeckGLBaseRenderer** — subclasses override `buildLayers()`, may override the view kind / initial view state for Map/Orbit/Orthographic charts; cleanup handled by the `DeckGLChart` wrapper FC which calls `deck.finalize()` on unmount
  - **ReglBaseRenderer** — custom WebGL via regl; `ReglChart` owns one canvas, WebGL context/regl instance creation, sizing, redraw, and cleanup
  - **Canvas2DBaseRenderer** — fallback for simple custom Canvas2D charts; `Canvas2DChart` owns one canvas, sizing, DPR scaling, redraw, and cleanup
- `ChartArea.tsx` keys the canvas div on `chartType` so a chart switch unmounts the old renderer and fires cleanup — critical for WebGL renderers.

### Data Pipeline
```
File Upload → PapaParse (CSV) / JSON.parse → rows + columns
  → analyzeColumns() → ColumnMeta[] with type/stats
  → detectShape() → DataShape (ohlcv, geo_points, hierarchy, etc.)
  → applyFilters() → DataView
  → ChartRenderer.render(dataView, config, theme)
```

### State Management (Zustand)
- `dataset-store` — loaded datasets, active dataset, loading state
- `chart-store` — layer stack (each layer: chartType + column assignments + options)
- `ui-store` — theme (dark/light), sidebar tab, modal state
- `filter-store` — active filters
- `annotation-store` — user annotations on data points

Each store is in its own file (AGENTS.md §7 "one concept per file"). Selectors that derive across stores (`useActiveDataset`, `useActiveChartConfig`) live alongside their primary store.

---

## 6. Data Contracts (Sacred — see global §7)

Never change these without a master-plan update + major semver bump:

- `DataSet` (`src/types/data.ts`) — loaded dataset with rows, columns, and `ColumnMeta[]`
- `ColumnMeta` — per-column type/stats/distribution
- `DataShape` — enum of detected shapes
- `ChartDefinition` (`src/charts/types.ts`) — metadata + `createRenderer()` factory
- `ChartRenderer` — `render(data, config, theme) → ReactElement`, optional `destroy?()`
- `ChartConfig` — per-layer column assignments + options
- `Filter` — predicate applied pre-render
- `ThemeTokens` — color + font scales

---

## 7. Common Tasks

### Add a new chart type
1. Read `CHARTS.md` for the chart's spec (shape, required columns, renderer backend).
2. Create `src/charts/families/{family}/{chart_name}.ts`.
3. Extend the appropriate base renderer.
4. Call `chartRegistry.register({...})` with the full `ChartDefinition`.
5. Add a side-effect import in the family's `index.ts`.
6. Add a unit test at `tests/unit/charts/families/{family}/{chart_name}.test.ts`.
7. Run `/pre-commit` (read-only audit).

### Add a new data format
1. Add parser in `src/data/parsers/`.
2. Add extension handling branch in `src/data/loader.ts`.
3. Add tests at `tests/unit/data/parsers/{format}-parser.test.ts`.

### Add a new chart family
1. Create directory `src/charts/families/{family_name}/`.
2. Add `index.ts` barrel file.
3. Import in `src/charts/families/index.ts`.
4. Add family metadata to `FAMILY_META` in `src/charts/types.ts`.

---

## 8. Local Commands

```bash
# Docker (default) — Mac/Linux
./bi_service.sh
# Docker (default) — Windows
bi_service.bat
# [k] stop + keep image  [q] stop + remove image  [v] also remove volumes  [r] full restart

# Local dev
npm run dev           # Vite dev server, port 5176 (configurable via BI_PORT)
npm run build         # Production build
npm run typecheck     # tsc -b (all configs)
npm run lint          # ESLint
npm run test          # Vitest run (one-shot)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Coverage report (text + cobertura + html in coverage/)
```

---

## 9. Testing Requirements

- **Framework:** Vitest + @testing-library/react + jsdom. Setup at `tests/setup.ts` (jest-dom + `afterEach(cleanup)` + ResizeObserver/canvas/WebGL mocks).
- **Layout:** `tests/unit/<area>/<module>.test.{ts,tsx}` mirroring `src/<area>/<module>`.
- **Coverage target: 100%** per global AGENTS.md §7 — enforced in `vitest.config.ts` thresholds; CI fails on drop.
- **Pragma discipline:** `/* v8 ignore ... */` only on genuinely untestable branches (e.g., `if __name__ === 'main':` analogs, DOM-only bootstrap code) — with a justifying comment.
- **Excluded from coverage** (configured in `vitest.config.ts`): `src/main.tsx`, `src/app/App.tsx`, type-only files (`src/types/**`, `*.d.ts`), barrel files (`src/**/index.ts`), CSS. Everything else is measured.
- **Component tests** use `render` from `@testing-library/react` and query by role/text — never CSS selectors.
- **Known pitfalls:**
  - Vitest does not auto-cleanup like Jest — `tests/setup.ts` calls `cleanup()` in `afterEach`.
  - deck.gl and ECharts both need a canvas mock; WebGL contexts return `null` in jsdom (renderer tests that need live WebGL should mock `@deck.gl/react` or `echarts-for-react` at the module level — see `tests/unit/charts/deckgl-renderer.test.tsx`).
- **Numerical comparisons:** for chart-computation tests (e.g., histogram bin counts), use exact assertions. For floating-point aggregates, use explicit tolerances.

---

## 10. CI/CD

- **Pipeline:** `.github/workflows/ci.yml`
- **Stages:** `lint → typecheck → test+coverage → build → docker`
- **Coverage gate:** `test` stage fails if coverage drops below the threshold in `vitest.config.ts`. `build` needs `test`.
- **Docker stage** only runs on `main` and `staging` branches.
- **Release:** manual pipeline trigger bumps `package.json` version — do NOT edit the `version` field directly (per global §6).

---

## 11. Change Policy

For every non-trivial change:
1. **`docs/status.md`** — update "Current State" if the architecture or ship state changed; update "What's Next" if priorities shifted.
2. **`docs/versions.md`** — add a new `## vX.Y.Z` entry (compute the next version per semver; see global §6). Only one unreleased version at a time.
3. **Tests** — new logic gets a test. Coverage must stay ≥ threshold.
4. **AGENTS.md / master plan** — update if the change touches a contract, a rule, or a phase-level scope.

---

## 12. Phase 2 Completion Gate

Phase 2 is done when:
1. All 193 chart types registered (run `/chart-status` — reports 193/193).
2. Each chart renders correctly with a representative sample dataset.
3. No chart throws on its documented minimum-column shape (see `CHARTS.md`).
4. `/chart-status` shows zero missing charts across all 13 families.
5. Every chart has at least one smoke test.
6. `npm run build` clean.
7. Full CI pipeline green on `main`.
8. `docs/status.md` and `docs/versions.md` updated.

---

## 13. Output & Completion Self-Audit

After every non-trivial task, run yourself through the global §15 checklist. Project-specific extensions:

- **Chart-count check:** if charts were added/removed, confirm `/chart-status` reflects the new count.
- **No-cross-canvas check:** confirm no new renderer shares a canvas with another (each renderer mounts its own).
- **Theme-token-only check:** no hard-coded colors outside `src/theme/tokens.ts`.
- **Side-effect-import check:** every new chart file is imported in its family's `index.ts`.
- **Coverage check:** report what `npm run test:coverage` shows for files you touched.

---

## 14. Closing Reminder

Read this file before the next change. The preceding 14 sections exist because each rule traces to a prior session where generic defaults caused drift. **Maximal clarity. Minimal tech debt. Optimal alignment.**

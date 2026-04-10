# CLAUDE.md — Project Guide for Business Intelligence

## What This Project Is

The ultimate universal charting and data analysis platform — a single tool that can visualize and analyze any dataset from any domain. Built with React + TypeScript + WebGL, it targets 193 chart types across 13 families (distribution, categorical, time series, relationships, matrix/grid, hierarchical, network/flow, geographic, finance, statistical/model eval, composition, specialized, and 3D). Users upload tabular data (CSV, JSON currently; Excel/Parquet planned), the app auto-detects the data shape, suggests appropriate chart types, and provides interactive analysis.

This is designed to be a reusable tool across all projects — any data, any domain, any chart. See [CHARTS.md](CHARTS.md) for the full chart catalog, supported data shapes, and auto-detection rules.

## Current Progress

- **3 of 193 chart types implemented** (histogram, line, scatter)
- Architecture complete: chart registry, renderer base classes (ECharts + deck.gl), data pipeline, shape detection, Zustand stores, dark/light theme, Docker
- Use `/new-chart` or `/scaffold-charts` to add chart types rapidly
- Use `/chart-status` to see implementation progress by family

## Tech Stack

- **React 19 + TypeScript** — UI framework
- **Vite** — build tool and dev server
- **Apache ECharts 6** — Canvas/WebGL chart rendering (~120 chart types)
- **deck.gl 9** — WebGL-native rendering for large datasets, geo, 3D (~40 chart types)
- **regl** — custom WebGL shaders for specialized charts
- **Zustand + Immer** — lightweight reactive state management
- **Tailwind CSS v4** — utility-first styling
- **Radix UI** — accessible UI primitives
- **PapaParse** — CSV parsing
- **D3** — computation/layouts (force, hierarchy), rendered into WebGL/Canvas
- **Docker + nginx** — containerized production deployment

## Project Structure

```
src/
  app/App.tsx            → Root component, imports theme + layout + chart families
  main.tsx               → Entry point, mounts React app
  index.css              → Tailwind + CSS custom properties (dark/light themes)
  charts/
    registry.ts          → ChartRegistry singleton (register/get/suggest)
    types.ts             → ChartDefinition, ChartRenderer, ChartConfig interfaces
    renderers/           → Base renderer classes (ECharts, deck.gl, regl)
    families/            → One directory per chart family, one file per chart type
      index.ts           → Barrel import that triggers all chart registrations
      distribution/      → histogram.ts, kde.ts, violin.ts, etc.
      categorical/       → bar.ts, grouped_bar.ts, pareto.ts, etc.
      time-series/       → line.ts, area.ts, candlestick.ts, etc.
      relationships/     → scatter.ts, hexbin.ts, pairplot.ts, etc.
      ...                → (13 family directories total)
  data/
    loader.ts            → File upload → parser dispatch → DataSet
    parsers/             → CSV, JSON, Excel, Parquet parsers
    shape-detector.ts    → Column analysis → DataShape detection
    chart-suggester.ts   → DataShape → ranked chart suggestions
    transforms.ts        → Filter, sort, aggregate operations
  stores/
    dataset-store.ts     → Loaded datasets, active dataset
    chart-store.ts       → Chart layers, column assignments
    ui-store.ts          → Theme, sidebar state, modals
    filter-store.ts      → Active filters
    annotation-store.ts  → User annotations
  components/
    toolbar/Toolbar.tsx  → Upload button, theme toggle
    sidebar/Sidebar.tsx  → Tabs: Data, Charts, Layers, Style
    sidebar/ChartPicker.tsx → Family browser + chart type list
    chart-area/ChartArea.tsx → Renderer dispatch + column assignment bar
  theme/
    tokens.ts            → Dark + light ThemeTokens
    theme-provider.tsx   → React context for theme
  types/data.ts          → DataSet, ColumnMeta, DataShape, Filter types
```

## Key Patterns

### Chart Registry
- `ChartRegistry` singleton in `src/charts/registry.ts`
- Each chart type is a `ChartDefinition` with metadata + `createRenderer()` factory
- Charts register via side-effect imports: each family's `index.ts` imports chart files
- `src/charts/families/index.ts` is the barrel that triggers all registrations
- Registry is indexed by family and compatible data shapes for fast lookup

### Renderer Architecture
- `ChartRenderer` interface: `render(data, config, theme) → ReactElement`
- 4 renderer backends, each chart picks one:
  - **EChartsBaseRenderer** — wraps `echarts-for-react`, subclasses override `buildOption()`
  - **DeckGLBaseRenderer** — wraps `@deck.gl/react`, subclasses override `buildLayers()`
  - **ReglRenderer** — custom WebGL via regl
  - **Canvas2DRenderer** — fallback for simple charts
- Renderers never share a canvas; `ChartArea.tsx` mounts the correct one

### Data Pipeline
```
File Upload → PapaParse (CSV) / JSON.parse / XLSX → rows + columns
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

### Data Shape Detection
- `shape-detector.ts` analyzes column types and names
- Detects: OHLCV, geo points, hierarchy, network/edges, intervals, time series, etc.
- Returns `DataShape` enum used by `chartRegistry.suggestForShape()`

## Common Tasks

### Add a new chart type
1. Create `src/charts/families/{family}/{chart_name}.ts`
2. Extend the appropriate base renderer (EChartsBaseRenderer, DeckGLBaseRenderer, etc.)
3. Call `chartRegistry.register({...})` with chart metadata
4. Import the file in the family's `index.ts`

### Add a new data format
1. Add parser in `src/data/parsers/`
2. Add extension handling in `src/data/loader.ts`

### Add a new chart family
1. Create directory `src/charts/families/{family_name}/`
2. Add `index.ts` barrel file
3. Import in `src/charts/families/index.ts`
4. Add family metadata to `FAMILY_META` in `src/charts/types.ts`

## Running

```bash
# Docker (default) — Mac
./bi_service.sh

# Docker (default) — Windows
bi_service.bat

# Local dev with hot reload
npm run dev

# Production build
npm run build
```

## Testing Changes

After modifying any file:
1. Vite hot-reloads automatically in dev mode
2. Check browser console for errors (F12 → Console)
3. Run `npx tsc --noEmit` to type-check
4. Run `npm run build` to verify production build

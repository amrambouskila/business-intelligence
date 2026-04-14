# Status — Business Intelligence

## Current State

Architecture complete. 3 of 193 target chart types implemented (histogram, line, scatter).

## What's Built

- **Chart Registry**: `ChartRegistry` singleton with `register()`, `get()`, `suggestForShape()` methods
- **Renderer Architecture**: 4 backend classes (ECharts, deck.gl, regl, Canvas2D) with `buildOption()` / `buildLayers()` pattern
- **Data Pipeline**: File upload → PapaParse/JSON → column analysis → shape detection → chart suggestion
- **State Management**: Zustand + Immer stores for dataset, chart layers, UI, filters, annotations
- **Theming**: Dark/light mode with CSS custom properties and Tailwind v4
- **Docker**: Dockerfile (multi-stage node + nginx) + docker-compose + launcher scripts

## Implemented Charts

1. `distribution/histogram.ts` — ECharts renderer
2. `time-series/line.ts` — ECharts renderer
3. `relationships/scatter.ts` — ECharts renderer

## What's Next

- Expand chart families — use `/scaffold-charts` to batch-add chart types per family
- Start with distribution family (KDE, violin, box plot) and categorical family (bar, grouped bar, Pareto)
- Run `/chart-status` to see progress breakdown by family
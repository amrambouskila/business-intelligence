---
name: scaffold-charts
description: Batch-scaffold multiple chart types for a given family. Use when implementing an entire chart family at once.
---

# Scaffold Charts for a Family

Rapidly create multiple chart definitions for a single family.

## Input

The user provides:
- Family name (e.g., "distribution")
- List of chart types to create (e.g., "kde, violin, ecdf, ridgeline")

## Steps

1. Read `CHARTS.md` to get the spec for each requested chart (required columns, data shape, description)

2. Read an existing chart in the same family as a template (or `src/charts/families/distribution/histogram.ts` as default)

3. For each chart type:
   a. Determine the best renderer backend:
      - ECharts: most standard 2D charts (bar, line, scatter, pie, treemap, sankey, etc.)
      - deck.gl: large datasets, geo maps, 3D
      - regl: custom WebGL (beeswarm physics, volume rendering)
      - canvas2d: simple/HTML (tables, KPI cards)
   
   b. Create `src/charts/families/{family}/{chart_key}.ts` with:
      - Renderer class extending the appropriate base
      - `chartRegistry.register()` call with correct metadata
      - `compatibleShapes` from CHARTS.md
      - `requiredColumns` with correct roles and accepted types
   
   c. Add import to `src/charts/families/{family}/index.ts`

4. After all charts are created:
```sh
npx tsc --noEmit
```

5. Report: "Created N charts in {family} family. Registry now has M total charts."
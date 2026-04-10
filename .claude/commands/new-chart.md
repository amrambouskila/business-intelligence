# Add a New Chart Type

Scaffold a new chart type following the registry pattern. This command walks through creating a chart definition, renderer, and registration.

## Before Starting

1. Read `CLAUDE.md` — understand the architecture (chart registry, renderer backends, data pipeline)
2. Read `CHARTS.md` — find the chart spec (family, required columns, data shape)
3. Read `src/charts/types.ts` — understand `ChartDefinition`, `ChartRenderer`, `ColumnRole`
4. Read `src/charts/registry.ts` — understand registration
5. Read an existing chart for reference (e.g., `src/charts/families/distribution/histogram.ts`)

## Ask the User

1. **Which chart?** (name from CHARTS.md, e.g., "Violin Plot")
2. **Which family?** (distribution, categorical, time-series, relationships, matrix, hierarchical, network-flow, geographic, finance, statistical, composition, specialized, 3d)
3. **Which renderer backend?** (echarts, deckgl, regl, canvas2d) — suggest based on chart type
4. **Any special parameters?** (bins, bandwidth, aggregation, etc.)

## Generate Files

### 1. Chart Definition + Renderer

Create `src/charts/families/{family}/{chart_name}.ts`:

```typescript
import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class {ChartName}Renderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    // Implementation here
  }
}

chartRegistry.register({
  type: '{chart_key}',
  family: '{family}',
  name: '{Chart Display Name}',
  description: '{description}',
  renderer: '{backend}',
  compatibleShapes: [...],
  requiredColumns: [...],
  optionalColumns: [...],
  createRenderer: () => new {ChartName}Renderer(),
});
```

### 2. Update Family Index

Add import to `src/charts/families/{family}/index.ts`:
```typescript
import './{chart_name}';
```

### 3. Verify

- Run `npx tsc --noEmit` — no type errors
- Run `npm run build` — builds clean
- Check that `chartRegistry.count` increased by 1

## Rules

- One chart definition per file
- File name matches chart key (snake_case)
- Always register via `chartRegistry.register()` at module level (side-effect import)
- Use the appropriate base renderer for the backend
- Set `compatibleShapes` to all shapes this chart can handle
- Set `requiredColumns` with correct `acceptedTypes` for each role
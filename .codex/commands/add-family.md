# Add a New Chart Family

Scaffold an entire new chart family directory and wire it into the registry.

## Before Starting

1. Read `AGENTS.md` — understand the chart family architecture
2. Read `CHARTS.md` — find all charts in the target family
3. Read `src/charts/types.ts` — understand `ChartFamily`, `FAMILY_META`

## Ask the User

1. **Which family?** (must be one of the 13 in CHARTS.md)
2. **Which renderer backend** is primary for this family? (echarts, deckgl, regl, canvas2d)
3. **Start with which charts?** (list specific chart types to implement first)

## Generate Files

### 1. Add Family Metadata

Update `src/charts/types.ts` — add entry to `FAMILY_META` if not already present.

### 2. Create Family Directory

Create `src/charts/families/{family_name}/index.ts` with imports for initial charts.

### 3. Create Chart Files

For each chart in the family, run the `/new-chart` workflow.

### 4. Update Barrel Import

Add import to `src/charts/families/index.ts`:
```typescript
import './{family_name}';
```

### 5. Update Chart Suggester

Add the new chart types to `src/data/chart-suggester.ts` default suggestions.

### 6. Verify

- Run `/validate-registry` to check everything is wired up
- Run `npx tsc --noEmit` — no type errors
- Run `npm run build` — builds clean
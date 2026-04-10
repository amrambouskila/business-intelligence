# Validate Chart Registry

Catch structural issues in the chart registry — missing imports, orphaned files, mismatched types.

## Step 1: Scan Chart Files

Find all `.ts` files in `src/charts/families/` that contain `chartRegistry.register`.
For each, extract the `type`, `family`, `renderer`, and `compatibleShapes`.

## Step 2: Check Family Index Files

For each family directory in `src/charts/families/`:
1. Read the family's `index.ts`
2. Verify every chart file in that directory is imported
3. Flag any chart files that exist but aren't imported (won't register!)

## Step 3: Check Barrel Import

Read `src/charts/families/index.ts`:
- Verify every family directory is imported
- Flag any missing family imports

## Step 4: Cross-Reference Types

For each registered chart:
1. Verify `requiredColumns[].acceptedTypes` are valid `ColumnType` values
2. Verify `compatibleShapes` are valid `DataShape` values
3. Verify `renderer` is a valid `RendererBackend` value
4. Verify `family` is a valid `ChartFamily` value

## Step 5: Check Chart Suggester

Read `src/data/chart-suggester.ts`:
- Verify all registered chart types appear in at least one suggestion list
- Flag charts that are registered but never suggested

## Step 6: Report

```
=== REGISTRY VALIDATION ===
Chart files found:     N
Charts registered:     N (should match)
Family imports:        PASS/FAIL
Barrel import:         PASS/FAIL
Type cross-reference:  PASS/FAIL
Suggester coverage:    X of N charts have suggestions

Issues:
- [file:line] description
```

PASS if all checks clear. FAIL with specific file:line references for each issue.
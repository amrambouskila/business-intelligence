# Code Review for Business Intelligence

Review changed code against project architecture standards.

## Step 1: Load Context

1. Read `AGENTS.md` — architecture rules, patterns, project structure
2. Read `CHARTS.md` — chart specifications (if chart code was changed)

## Step 2: Identify Changed Files

Run `git diff --name-only` to find all modified files.
If not a git repo, ask the user which files were changed.

## Step 3: Review Checklist

For each changed file, check:

### Architecture Compliance
- [ ] One chart definition per file
- [ ] Charts register via `chartRegistry.register()` as a side-effect import
- [ ] Family `index.ts` imports all chart files in that family
- [ ] Renderers extend the correct base class (EChartsBaseRenderer, DeckGLBaseRenderer, etc.)
- [ ] No direct DOM manipulation — all rendering through chart renderer interface

### Type Safety
- [ ] No `any` types (use `unknown` + type guards if needed)
- [ ] All `ChartDefinition.requiredColumns` have correct `acceptedTypes`
- [ ] `compatibleShapes` accurately reflects what the chart can handle
- [ ] Store selectors are typed correctly

### Reuse & Duplication
- [ ] Search for existing utilities before creating new ones
- [ ] Shared rendering logic belongs in base renderer classes, not individual charts
- [ ] Color/theme logic uses `ThemeTokens`, not hardcoded values

### Performance
- [ ] Large datasets: does the chart set `maxRecommendedPoints`?
- [ ] ECharts: using `large: true` and `largeThreshold` for scatter-type charts?
- [ ] deck.gl: using appropriate layer types for data size?
- [ ] No unnecessary re-renders (check Zustand selector granularity)

### Data Pipeline
- [ ] Shape detection in `shape-detector.ts` covers new data patterns
- [ ] Chart suggester in `chart-suggester.ts` includes new chart types
- [ ] Filters and transforms work with the new chart's data requirements

### Forward Compatibility
- [ ] New chart types are in CHARTS.md spec
- [ ] No tight coupling between chart implementations
- [ ] Theme tokens used consistently (dark/light mode works)

## Step 4: Report

Output a structured report:
- **Critical** — must fix before merging (type errors, broken patterns, missing registration)
- **Recommended** — should fix (performance, reuse opportunities, missing compatibleShapes)
- **Minor** — nice to have (naming, comments, organization)

Include `file:line` references for each finding.
---
name: chart-status
description: Show the current chart implementation status — how many of the 193 target charts are registered, broken down by family. Use when the user asks about progress.
trigger: proactive
---

# Chart Implementation Status

Show progress toward the 193 chart type target.

## Steps

1. Count registered charts per family:
```sh
for dir in src/charts/families/*/; do
  family=$(basename "$dir")
  count=$(grep -l 'chartRegistry.register' "$dir"*.ts 2>/dev/null | wc -l | tr -d ' ')
  echo "$family: $count"
done
```

2. Count total registered charts:
```sh
grep -r 'chartRegistry.register' src/charts/families/ 2>/dev/null | wc -l | tr -d ' '
```

3. Compare against CHARTS.md targets:
- Distribution: 21 target
- Categorical: 15 target
- Time Series: 22 target
- Relationships: 26 target
- Matrix/Grid: 10 target
- Hierarchical: 8 target
- Network/Flow: 10 target
- Geographic: 14 target
- Finance: 15 target
- Statistical: 19 target
- Composition: 10 target
- Specialized: 17 target
- 3D: 6 target
- **Total: 193 target**

4. Report as a table:
```
Family           | Implemented | Target | Progress
-----------------+-------------+--------+---------
distribution     |           X |     21 |    X.X%
categorical      |           X |     15 |    X.X%
...
TOTAL            |           X |    193 |    X.X%
```
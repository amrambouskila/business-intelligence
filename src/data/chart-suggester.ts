import type { DataShape, ColumnMeta } from '@/types/data';
import type { ChartDefinition } from '@/charts/types';
import { chartRegistry } from '@/charts/registry';

/**
 * Whether every required role can be filled by a DISTINCT column — mirrors the
 * consume-on-assign matching in ChartArea, so a chart needing N same-typed
 * columns is not suggested when fewer than N exist.
 */
function isFillable(def: ChartDefinition, columns: ColumnMeta[]): boolean {
  const used = new Set<string>();
  return def.requiredColumns.every((role) => {
    const match = columns.find((c) => role.acceptedTypes.includes(c.type) && !used.has(c.name));
    if (!match) return false;
    used.add(match.name);
    return true;
  });
}

/**
 * Relevance score of a chart for a detected shape + the dataset's columns.
 * Returns 0 when the chart does not apply (wrong shape, or a required column
 * cannot be filled — i.e. it could not actually render). Among applicable
 * charts a more specialized one (fewer compatible shapes) scores higher.
 */
export function scoreChart(def: ChartDefinition, shape: DataShape, columns: ColumnMeta[]): number {
  if (!def.compatibleShapes.includes(shape)) return 0;
  if (!isFillable(def, columns)) return 0;
  return 1 + 1 / def.compatibleShapes.length;
}

/**
 * Charts ranked by relevance for the detected shape + columns, best first.
 * Drives the "Suggested for your data" surface in the chart picker.
 */
export function suggestCharts(shape: DataShape, columns: ColumnMeta[]): ChartDefinition[] {
  return chartRegistry
    .all()
    .map((def) => ({ def, score: scoreChart(def, shape, columns) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.def.name.localeCompare(b.def.name))
    .map((x) => x.def);
}

export interface PivotResult {
  /** Unique key values (the shared x-axis categories), in first-seen order. */
  keys: string[];
  /** Unique group values (one rendered series each), in first-seen order. */
  groups: string[];
  /** matrix[groupIndex][keyIndex] = summed finite value (0 where absent). */
  matrix: number[][];
}

/**
 * Pivot long-form (key, group, value) rows into a dense group × key matrix.
 * One source of truth for grouped/stacked bar and stacked area: keys/groups are
 * index-addressed (no string-concatenation collisions), missing cells are 0
 * (correct stack baseline), duplicate (key, group) pairs are summed, and
 * non-finite values contribute 0.
 */
export function pivotLongForm(keyData: unknown[], groupData: unknown[], valueData: unknown[]): PivotResult {
  const keys: string[] = [];
  const keyIndex = new Map<string, number>();
  const groups: string[] = [];
  const groupIndex = new Map<string, number>();
  const matrix: number[][] = [];

  const n = Math.min(keyData.length, groupData.length, valueData.length);
  for (let i = 0; i < n; i++) {
    const k = String(keyData[i]);
    let ki = keyIndex.get(k);
    if (ki === undefined) {
      ki = keys.length;
      keyIndex.set(k, ki);
      keys.push(k);
      for (const row of matrix) row.push(0);
    }

    const g = String(groupData[i]);
    let gi = groupIndex.get(g);
    if (gi === undefined) {
      gi = groups.length;
      groupIndex.set(g, gi);
      groups.push(g);
      matrix.push(new Array(keys.length).fill(0));
    }

    const raw = valueData[i];
    if (typeof raw === 'number' && Number.isFinite(raw)) matrix[gi][ki] += raw;
  }

  return { keys, groups, matrix };
}

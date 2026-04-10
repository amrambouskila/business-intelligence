import type { DataSet, DataView, Filter } from '@/types/data';

/** Apply active filters to a dataset and return a DataView. */
export function applyFilters(ds: DataSet, filters: Filter[]): DataView {
  const active = filters.filter((f) => f.active);
  if (active.length === 0) {
    return {
      sourceId: ds.id,
      rows: ds.rows,
      columnArrays: ds.columnArrays,
      columns: ds.columns,
      rowCount: ds.rowCount,
      filters: [],
    };
  }

  let filtered = ds.rows;
  for (const f of active) {
    filtered = filtered.filter((row) => matchFilter(row[f.column], f));
  }

  const columnArrays: Record<string, unknown[]> = {};
  for (const col of ds.columns) {
    columnArrays[col.name] = filtered.map((r) => r[col.name]);
  }

  return {
    sourceId: ds.id,
    rows: filtered,
    columnArrays,
    columns: ds.columns,
    rowCount: filtered.length,
    filters: active,
  };
}

function matchFilter(value: unknown, f: Filter): boolean {
  switch (f.op) {
    case 'eq': return value === f.value;
    case 'neq': return value !== f.value;
    case 'gt': return (value as number) > (f.value as number);
    case 'gte': return (value as number) >= (f.value as number);
    case 'lt': return (value as number) < (f.value as number);
    case 'lte': return (value as number) <= (f.value as number);
    case 'in': return (f.value as unknown[]).includes(value);
    case 'between': {
      const [lo, hi] = f.value as [number, number];
      return (value as number) >= lo && (value as number) <= hi;
    }
    case 'regex': return new RegExp(f.value as string).test(String(value));
    default: return true;
  }
}

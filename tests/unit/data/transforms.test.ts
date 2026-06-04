import { describe, it, expect } from 'vitest';
import { applyFilters } from '@/data/transforms';
import type { DataSet, Filter } from '@/types/data';

function makeDataSet(): DataSet {
  const rows = [
    { id: 1, name: 'alpha', value: 10 },
    { id: 2, name: 'beta', value: 20 },
    { id: 3, name: 'gamma', value: 30 },
    { id: 4, name: 'delta', value: 40 },
  ];
  return {
    id: 'ds1',
    name: 'test',
    rows,
    columnArrays: {
      id: rows.map((r) => r.id),
      name: rows.map((r) => r.name),
      value: rows.map((r) => r.value),
    },
    columns: [
      { name: 'id', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'name', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
    shape: 'generic',
    fileSize: 0,
    loadedAt: new Date(),
  };
}

function filter(partial: Partial<Filter> & Pick<Filter, 'column' | 'op' | 'value'>): Filter {
  return { id: 'f', active: true, ...partial } as Filter;
}

describe('applyFilters', () => {
  it('returns the full dataset when no filters are active', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, []);
    expect(view.rowCount).toBe(4);
    expect(view.rows).toBe(ds.rows);
    expect(view.filters).toHaveLength(0);
  });

  it('skips inactive filters', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [
      { id: 'f1', column: 'value', op: 'gt', value: 100, active: false },
    ]);
    expect(view.rowCount).toBe(4);
  });

  it('filters by eq', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'name', op: 'eq', value: 'beta' })]);
    expect(view.rowCount).toBe(1);
    expect(view.rows[0].name).toBe('beta');
  });

  it('filters by neq', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'name', op: 'neq', value: 'beta' })]);
    expect(view.rowCount).toBe(3);
  });

  it('filters by gt/gte/lt/lte', () => {
    const ds = makeDataSet();
    expect(applyFilters(ds, [filter({ column: 'value', op: 'gt', value: 20 })]).rowCount).toBe(2);
    expect(applyFilters(ds, [filter({ column: 'value', op: 'gte', value: 20 })]).rowCount).toBe(3);
    expect(applyFilters(ds, [filter({ column: 'value', op: 'lt', value: 20 })]).rowCount).toBe(1);
    expect(applyFilters(ds, [filter({ column: 'value', op: 'lte', value: 20 })]).rowCount).toBe(2);
  });

  it('filters by in', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'name', op: 'in', value: ['alpha', 'gamma'] })]);
    expect(view.rowCount).toBe(2);
  });

  it('filters by between', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'value', op: 'between', value: [15, 35] })]);
    expect(view.rowCount).toBe(2);
    expect(view.rows.map((r) => r.value)).toEqual([20, 30]);
  });

  it('filters by regex', () => {
    const ds = makeDataSet();
    // names: alpha, beta, gamma, delta — matches a|b|d starts = 3
    const view = applyFilters(ds, [filter({ column: 'name', op: 'regex', value: '^[abd]' })]);
    expect(view.rowCount).toBe(3);
  });

  it('composes multiple active filters (AND semantics)', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [
      filter({ column: 'value', op: 'gt', value: 10 }),
      filter({ column: 'value', op: 'lt', value: 40 }),
    ]);
    expect(view.rowCount).toBe(2);
    expect(view.filters).toHaveLength(2);
  });

  it('returns no matches when predicate fails for all rows', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'value', op: 'gt', value: 999 })]);
    expect(view.rowCount).toBe(0);
  });

  it('treats invalid regex filters as no matches instead of throwing', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'name', op: 'regex', value: '[' })]);
    expect(view.rowCount).toBe(0);
  });

  it('defaults to true for an unknown operator', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [
      filter({ column: 'value', op: 'unknown' as unknown as Filter['op'], value: 0 }),
    ]);
    expect(view.rowCount).toBe(4);
  });

  it('rebuilds columnArrays based on the filtered rows', () => {
    const ds = makeDataSet();
    const view = applyFilters(ds, [filter({ column: 'value', op: 'gt', value: 20 })]);
    expect(view.columnArrays.value).toEqual([30, 40]);
    expect(view.columnArrays.name).toEqual(['gamma', 'delta']);
  });
});

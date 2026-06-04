import { describe, it, expect } from 'vitest';
import { getSampleOptions, loadSampleData, type SampleKey } from '@/data/sample-data';
import type { DataShape } from '@/types/data';

const EXPECTED_SHAPE: Record<SampleKey, DataShape> = {
  stock: 'ohlcv',
  numeric: 'category_numeric',
  sales: 'category_numeric',
  classification: 'category_numeric',
  regression: 'three_numeric',
  estimates: 'category_numeric',
  features: 'category_numeric',
  hierarchy: 'hierarchy',
  flow: 'source_target_value',
  funnel: 'category_numeric',
  journey: 'category_numeric',
  matrix: 'matrix',
  process: 'time_numeric',
  forecast: 'time_numeric',
  kpi: 'many_numeric',
  demographics: 'category_numeric',
  timeline: 'intervals',
  topics: 'category_numeric',
  cohort: 'time_numeric',
  conversionPath: 'source_target_value',
  ranking: 'time_series_numeric',
  orderBook: 'three_numeric',
  yieldCurve: 'two_numeric',
  tradingBuckets: 'category_numeric',
  survival: 'category_numeric',
  embedding: 'category_numeric',
  explainability: 'category_numeric',
  sequence: 'category_numeric',
  geo: 'geo_points',
};

const ALL_KEYS = Object.keys(EXPECTED_SHAPE) as SampleKey[];

describe('getSampleOptions', () => {
  it('exposes every sample key with a human label', () => {
    const opts = getSampleOptions();
    expect(opts.map((o) => o.value).sort()).toEqual([...ALL_KEYS].sort());
    for (const opt of opts) expect(opt.label.length).toBeGreaterThan(0);
  });
});

describe('loadSampleData', () => {
  it.each(ALL_KEYS)('builds a non-empty, shape-correct dataset for "%s"', (key) => {
    const ds = loadSampleData(key);
    expect(ds.rowCount).toBeGreaterThan(0);
    expect(ds.rows).toHaveLength(ds.rowCount);
    expect(ds.columns.length).toBeGreaterThan(0);
    expect(ds.shape).toBe(EXPECTED_SHAPE[key]);
    // every declared column has a matching columnArray of the right length
    for (const col of ds.columns) {
      expect(ds.columnArrays[col.name]).toHaveLength(ds.rowCount);
    }
  });

  it.each(ALL_KEYS)('is deterministic for "%s" (identical rows across two loads)', (key) => {
    expect(loadSampleData(key).rows).toEqual(loadSampleData(key).rows);
  });

  it('keeps the OHLC invariant (high ≥ low) for the stock sample', () => {
    const ds = loadSampleData('stock');
    for (const row of ds.rows as Array<Record<string, number>>) {
      expect(row.High).toBeGreaterThanOrEqual(row.Low);
    }
  });

  it('skips weekends in the stock sample (≈180 of 252 calendar days)', () => {
    const ds = loadSampleData('stock');
    expect(ds.rowCount).toBeGreaterThan(150);
    expect(ds.rowCount).toBeLessThanOrEqual(252);
  });
});

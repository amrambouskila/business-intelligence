import { describe, it, expect } from 'vitest';
import { getSampleOptions, loadSampleData } from '@/data/sample-data';

describe('getSampleOptions', () => {
  it('exposes both sample keys with human labels', () => {
    const opts = getSampleOptions();
    const values = opts.map((o) => o.value);
    expect(values).toEqual(['stock', 'numeric']);
    for (const opt of opts) expect(opt.label.length).toBeGreaterThan(0);
  });
});

describe('loadSampleData', () => {
  it('generates an OHLCV-shaped dataset for the stock sample', () => {
    const ds = loadSampleData('stock');
    expect(ds.shape).toBe('ohlcv');
    // Generator iterates 252 calendar days and skips weekends — expect ~180
    expect(ds.rowCount).toBeGreaterThan(150);
    expect(ds.rowCount).toBeLessThanOrEqual(252);
    const names = ds.columns.map((c) => c.name.toLowerCase());
    for (const required of ['open', 'high', 'low', 'close']) {
      expect(names).toContain(required);
    }
    // OHLC invariant
    for (const row of ds.rows as Array<Record<string, number>>) {
      expect(row.High).toBeGreaterThanOrEqual(row.Low);
    }
  });

  it('generates a many_numeric sample for the numeric key', () => {
    const ds = loadSampleData('numeric');
    expect(ds.rowCount).toBe(500);
    const numericCols = ds.columns.filter((c) =>
      ['numeric', 'integer', 'float'].includes(c.type),
    );
    expect(numericCols.length).toBeGreaterThanOrEqual(3);
  });
});

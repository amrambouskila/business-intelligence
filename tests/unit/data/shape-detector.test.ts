import { describe, it, expect } from 'vitest';
import { analyzeColumns, detectShape } from '@/data/shape-detector';

describe('analyzeColumns', () => {
  it('classifies integer columns', () => {
    const rows = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const [col] = analyzeColumns(rows, ['n']);
    expect(col.type).toBe('integer');
    expect(col.stats?.min).toBe(1);
    expect(col.stats?.max).toBe(3);
    expect(col.stats?.mean).toBeCloseTo(2);
    expect(col.stats?.median).toBe(2);
  });

  it('classifies float columns and computes stats', () => {
    const rows = [{ v: 1.1 }, { v: 2.2 }, { v: 3.3 }, { v: 4.4 }];
    const [col] = analyzeColumns(rows, ['v']);
    expect(col.type).toBe('float');
    expect(col.stats).toBeDefined();
    expect(col.stats!.min).toBeCloseTo(1.1, 5);
    expect(col.stats!.max).toBeCloseTo(4.4, 5);
    expect(col.stats!.std).toBeGreaterThan(0);
  });

  it('computes median for even-length numeric arrays', () => {
    const rows = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
    const [col] = analyzeColumns(rows, ['v']);
    expect(col.stats!.median).toBe(2.5);
  });

  it('classifies boolean columns', () => {
    const rows = [{ b: true }, { b: false }, { b: true }];
    const [col] = analyzeColumns(rows, ['b']);
    expect(col.type).toBe('boolean');
  });

  it('classifies datetime columns by name heuristic', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      timestamp: `2026-01-0${(i % 9) + 1}`,
    }));
    const [col] = analyzeColumns(rows, ['timestamp']);
    expect(col.type).toBe('datetime');
    expect(col.dateRange).toBeDefined();
    expect(col.dateRange!.min).toBeInstanceOf(Date);
    expect(col.dateRange!.max).toBeInstanceOf(Date);
  });

  it('classifies datetime columns by string-value parsing when name does not hint', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      when: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    }));
    const [col] = analyzeColumns(rows, ['when']);
    expect(col.type).toBe('datetime');
  });

  it('classifies lat/lng numeric columns as geo_point', () => {
    const rows = [
      { lat: 40.7, lng: -74.0 },
      { lat: 34.0, lng: -118.2 },
    ];
    const [lat, lng] = analyzeColumns(rows, ['lat', 'lng']);
    expect(lat.type).toBe('geo_point');
    expect(lng.type).toBe('geo_point');
  });

  it('classifies category columns with low unique ratio', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      color: ['red', 'green', 'blue'][i % 3],
    }));
    const [col] = analyzeColumns(rows, ['color']);
    expect(col.type).toBe('category');
    expect(col.topValues).toBeDefined();
    expect(col.topValues!.length).toBe(3);
  });

  it('classifies high-cardinality string columns as text', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      phrase: `unique phrase number ${i} with some extra variation ${i * 7}`,
    }));
    const [col] = analyzeColumns(rows, ['phrase']);
    expect(col.type).toBe('text');
    expect(col.topValues).toBeDefined();
  });

  it('returns unknown for columns with only null values', () => {
    const rows = [{ x: null }, { x: null }];
    const [col] = analyzeColumns(rows, ['x']);
    expect(col.type).toBe('unknown');
    expect(col.nullCount).toBe(2);
    expect(col.nullable).toBe(true);
  });

  it('tracks null counts and uniqueness', () => {
    const rows = [{ v: 1 }, { v: 2 }, { v: null }, { v: 1 }];
    const [col] = analyzeColumns(rows, ['v']);
    expect(col.nullCount).toBe(1);
    expect(col.uniqueCount).toBe(2);
    expect(col.nullable).toBe(true);
  });
});

describe('detectShape', () => {
  it('detects OHLCV from open/high/low/close columns', () => {
    const rows = [
      { open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { open: 105, high: 115, low: 100, close: 112, volume: 1200 },
    ];
    const columns = analyzeColumns(rows, ['open', 'high', 'low', 'close', 'volume']);
    expect(detectShape(columns)).toBe('ohlcv');
  });

  it('detects geo_points when two or more geo columns exist', () => {
    const rows = [
      { lat: 40.7, lng: -74.0 },
      { lat: 34.0, lng: -118.2 },
    ];
    const columns = analyzeColumns(rows, ['lat', 'lng']);
    expect(detectShape(columns)).toBe('geo_points');
  });

  it('detects hierarchy from id + parent columns', () => {
    const rows = [
      { id: 1, parent: null, name: 'root' },
      { id: 2, parent: 1, name: 'child' },
      { id: 3, parent: 1, name: 'child2' },
    ];
    const columns = analyzeColumns(rows, ['id', 'parent', 'name']);
    expect(detectShape(columns)).toBe('hierarchy');
  });

  it('detects nodes_edges when source+target exist without a value column', () => {
    const rows = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'd' },
      { source: 'd', target: 'a' },
    ];
    const columns = analyzeColumns(rows, ['source', 'target']);
    expect(detectShape(columns)).toBe('nodes_edges');
  });

  it('detects source_target_value when source+target+numeric exist', () => {
    const rows = [
      { source: 'a', target: 'b', weight: 5 },
      { source: 'b', target: 'c', weight: 3 },
    ];
    const columns = analyzeColumns(rows, ['source', 'target', 'weight']);
    expect(detectShape(columns)).toBe('source_target_value');
  });

  it('detects intervals from start+end columns', () => {
    const rows = [
      { start: '2026-01-01', end: '2026-01-05', task: 'a' },
      { start: '2026-01-06', end: '2026-01-10', task: 'b' },
    ];
    const columns = analyzeColumns(rows, ['start', 'end', 'task']);
    expect(detectShape(columns)).toBe('intervals');
  });

  it('detects time_series_numeric when time + category + numeric exist', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      timestamp: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      group: ['a', 'b', 'c'][i % 3],
      value: i * 1.5,
    }));
    const columns = analyzeColumns(rows, ['timestamp', 'group', 'value']);
    expect(detectShape(columns)).toBe('time_series_numeric');
  });

  it('detects time_numeric for datetime + numeric with no category', () => {
    const rows = [
      { timestamp: '2026-01-01', value: 100 },
      { timestamp: '2026-01-02', value: 105 },
      { timestamp: '2026-01-03', value: 103 },
    ];
    const columns = analyzeColumns(rows, ['timestamp', 'value']);
    expect(detectShape(columns)).toBe('time_numeric');
  });

  it('detects many_numeric for 5+ numeric columns', () => {
    const rows = Array.from({ length: 10 }, () => ({
      a: Math.random(),
      b: Math.random(),
      c: Math.random(),
      d: Math.random(),
      e: Math.random(),
    }));
    const columns = analyzeColumns(rows, ['a', 'b', 'c', 'd', 'e']);
    expect(detectShape(columns)).toBe('many_numeric');
  });

  it('detects three_numeric for exactly 3 numeric columns', () => {
    const rows = [
      { x: 1.1, y: 2.2, z: 3.3 },
      { x: 1.2, y: 2.3, z: 3.4 },
    ];
    const columns = analyzeColumns(rows, ['x', 'y', 'z']);
    expect(detectShape(columns)).toBe('three_numeric');
  });

  it('detects two_numeric for exactly 2 numeric columns', () => {
    const rows = [
      { x: 1.1, y: 2.2 },
      { x: 1.2, y: 2.3 },
    ];
    const columns = analyzeColumns(rows, ['x', 'y']);
    expect(detectShape(columns)).toBe('two_numeric');
  });

  it('detects category_numeric for category + numeric pair', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      group: ['A', 'B', 'C'][i % 3],
      amount: i * 1.1,
    }));
    const columns = analyzeColumns(rows, ['group', 'amount']);
    expect(detectShape(columns)).toBe('category_numeric');
  });

  it('detects single_numeric for lone numeric column', () => {
    const rows = [{ v: 1.1 }, { v: 2.2 }];
    const columns = analyzeColumns(rows, ['v']);
    expect(detectShape(columns)).toBe('single_numeric');
  });

  it('falls back to generic when no specific shape matches', () => {
    const rows = [{ label: 'alpha' }, { label: 'beta' }];
    const columns = analyzeColumns(rows, ['label']);
    expect(detectShape(columns)).toBe('generic');
  });
});

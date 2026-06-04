import { describe, it, expect } from 'vitest';
import { scoreChart, suggestCharts } from '@/data/chart-suggester';
import { chartRegistry } from '@/charts/registry';
// Register the real charts so the suggester is exercised against actual output.
import '@/charts/families/distribution/histogram';
import '@/charts/families/time-series/line';
import '@/charts/families/relationships/scatter';
import type { ChartDefinition, ColumnRole } from '@/charts/types';
import type { ColumnMeta, DataShape } from '@/types/data';

function stub(type: string, shapes: DataShape[], required: ColumnRole[] = []): ChartDefinition {
  return {
    type, family: 'distribution', name: type, description: '', renderer: 'echarts',
    compatibleShapes: shapes, requiredColumns: required,
    createRenderer: () => ({ render: () => null as never }),
  };
}

function col(name: string, type: ColumnMeta['type']): ColumnMeta {
  return { name, type, nullable: false, uniqueCount: 1, nullCount: 0 };
}

function register(def: ChartDefinition): void {
  if (!chartRegistry.get(def.type)) chartRegistry.register(def);
}

describe('scoreChart', () => {
  it('scores 0 for a shape the chart is not compatible with', () => {
    expect(scoreChart(stub('__sc_a__', ['single_numeric']), 'two_numeric', [])).toBe(0);
  });

  it('scores 0 when a required column cannot be filled by the data', () => {
    const def = stub('__sc_b__', ['single_numeric'], [{ role: 'v', acceptedTypes: ['integer'], label: 'V' }]);
    expect(scoreChart(def, 'single_numeric', [col('c', 'category')])).toBe(0);
  });

  it('scores positive for a compatible, fillable chart', () => {
    const def = stub('__sc_c__', ['single_numeric'], [{ role: 'v', acceptedTypes: ['integer'], label: 'V' }]);
    expect(scoreChart(def, 'single_numeric', [col('n', 'integer')])).toBeGreaterThan(0);
  });

  it('ranks a more specialized chart above a generalist for the same shape', () => {
    const specialized = stub('__sc_spec__', ['survival']);
    const generalist = stub('__sc_gen__', ['survival', 'generic', 'many_numeric', 'two_numeric']);
    expect(scoreChart(specialized, 'survival', [])).toBeGreaterThan(scoreChart(generalist, 'survival', []));
  });

  it('requires distinct columns for multiple same-typed required roles', () => {
    const twoNumeric = stub('__sc_two__', ['survival'], [
      { role: 'x', acceptedTypes: ['integer'], label: 'X' },
      { role: 'y', acceptedTypes: ['integer'], label: 'Y' },
    ]);
    // one numeric column cannot fill two numeric roles
    expect(scoreChart(twoNumeric, 'survival', [col('a', 'integer')])).toBe(0);
    // two distinct numeric columns can
    expect(scoreChart(twoNumeric, 'survival', [col('a', 'integer'), col('b', 'integer')])).toBeGreaterThan(0);
  });
});

describe('suggestCharts', () => {
  it('returns shape-compatible fillable charts, most specialized first', () => {
    register(stub('__sug_gen__', ['event_log', 'generic']));
    register(stub('__sug_spec__', ['event_log']));
    const types = suggestCharts('event_log', []).map((d) => d.type).filter((t) => t.startsWith('__sug_'));
    expect(types).toEqual(['__sug_spec__', '__sug_gen__']);
  });

  it('excludes charts whose required columns the dataset cannot fill', () => {
    register(stub('__sug_needs_int__', ['survival'], [{ role: 'x', acceptedTypes: ['integer'], label: 'X' }]));
    const types = suggestCharts('survival', [col('c', 'category')]).map((d) => d.type);
    expect(types).not.toContain('__sug_needs_int__');
  });

  it('breaks ties between equally-specialized charts by name', () => {
    register(stub('__sug_tie_b__', ['intervals']));
    register(stub('__sug_tie_a__', ['intervals']));
    const types = suggestCharts('intervals', []).map((d) => d.type).filter((t) => t.startsWith('__sug_tie_'));
    expect(types).toEqual(['__sug_tie_a__', '__sug_tie_b__']);
  });

  it('returns an empty array for a shape no registered chart targets', () => {
    expect(suggestCharts('geo_polygons', [])).toEqual([]);
  });
});

describe('suggestCharts against the real registered charts', () => {
  it('suggests histogram for single_numeric', () => {
    const types = suggestCharts('single_numeric', [col('v', 'integer')]).map((d) => d.type);
    expect(types).toContain('histogram');
  });

  it('suggests line and scatter for two_numeric (line first by name tiebreak)', () => {
    const types = suggestCharts('two_numeric', [col('x', 'integer'), col('y', 'integer')]).map((d) => d.type);
    expect(types).toContain('line');
    expect(types).toContain('scatter');
    expect(types.indexOf('line')).toBeLessThan(types.indexOf('scatter'));
  });

  it('suggests histogram but not scatter/line for category_numeric', () => {
    const types = suggestCharts('category_numeric', [col('g', 'category'), col('v', 'integer')]).map((d) => d.type);
    expect(types).toContain('histogram');
    expect(types).not.toContain('scatter');
    expect(types).not.toContain('line');
  });
});

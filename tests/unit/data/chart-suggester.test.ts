import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { suggestCharts, defaultSuggestions } from '@/data/chart-suggester';
import { chartRegistry } from '@/charts/registry';
import type { ChartDefinition } from '@/charts/types';
import type { DataShape } from '@/types/data';

function stub(type: string, shape: DataShape): ChartDefinition {
  return {
    type,
    family: 'distribution',
    name: type,
    description: '',
    renderer: 'echarts',
    compatibleShapes: [shape],
    requiredColumns: [],
    createRenderer: () => ({ render: () => null as never }),
  };
}

describe('suggestCharts', () => {
  const added: string[] = [];

  beforeEach(() => {
    const def = stub('__sug_single__', 'single_numeric');
    // Skip if a previous test in this process already registered it.
    if (!chartRegistry.get(def.type)) {
      chartRegistry.register(def);
      added.push(def.type);
    }
  });

  afterEach(() => {
    // Registry is a singleton — tests across the suite share it. We rely on
    // unique type names above so we do not need to mutate the registry.
    added.length = 0;
  });

  it('returns registered chart types for a shape', () => {
    const suggestions = suggestCharts('single_numeric');
    expect(suggestions).toContain('__sug_single__');
  });

  it('returns an empty array for a shape with no registered chart', () => {
    expect(suggestCharts('survival')).toEqual([]);
  });
});

describe('defaultSuggestions', () => {
  const allShapes: DataShape[] = [
    'single_numeric', 'category_numeric', 'time_numeric', 'time_series_numeric',
    'two_numeric', 'three_numeric', 'many_numeric', 'matrix', 'hierarchy',
    'nodes_edges', 'source_target_value', 'geo_points', 'geo_polygons',
    'intervals', 'ohlcv', 'survival', 'event_log', 'generic',
  ];

  it.each(allShapes)('returns non-empty suggestions for shape %s', (shape) => {
    const s = defaultSuggestions(shape);
    expect(s).toBeInstanceOf(Array);
    expect(s.length).toBeGreaterThan(0);
  });

  it('falls back to a default triple for an unrecognized shape', () => {
    const s = defaultSuggestions('not_a_real_shape' as unknown as DataShape);
    expect(s).toEqual(['line', 'bar', 'scatter']);
  });
});

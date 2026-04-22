import { describe, it, expect } from 'vitest';
import { chartRegistry } from '@/charts/registry';
import type { ChartDefinition } from '@/charts/types';

function stub(type: string, family: ChartDefinition['family']): ChartDefinition {
  return {
    type,
    family,
    name: type,
    description: '',
    renderer: 'echarts',
    compatibleShapes: ['generic'],
    requiredColumns: [],
    createRenderer: () => ({ render: () => null as never }),
  };
}

describe('chartRegistry', () => {
  it('registers a chart and exposes it via get()', () => {
    const def = stub('__reg_test_a__', 'distribution');
    chartRegistry.register(def);
    expect(chartRegistry.get('__reg_test_a__')).toBe(def);
  });

  it('throws on duplicate registration', () => {
    const def = stub('__reg_test_dup__', 'distribution');
    chartRegistry.register(def);
    expect(() => chartRegistry.register(def)).toThrow(/already registered/);
  });

  it('returns undefined for a missing type', () => {
    expect(chartRegistry.get('__not_a_type__')).toBeUndefined();
  });

  it('indexes by family', () => {
    const def = stub('__reg_fam__', 'specialized');
    chartRegistry.register(def);
    const defs = chartRegistry.getByFamily('specialized');
    expect(defs).toContain(def);
  });

  it('indexes by compatible shape', () => {
    const def: ChartDefinition = { ...stub('__reg_shape__', 'distribution'), compatibleShapes: ['ohlcv'] };
    chartRegistry.register(def);
    expect(chartRegistry.suggestForShape('ohlcv')).toContain(def);
  });

  it('returns empty arrays for unknown family / shape queries', () => {
    expect(chartRegistry.getByFamily('network-flow')).toBeInstanceOf(Array);
    expect(chartRegistry.suggestForShape('survival')).toEqual(
      chartRegistry.suggestForShape('survival'),
    );
  });

  it('all() includes every registered chart', () => {
    const def = stub('__reg_all__', 'distribution');
    chartRegistry.register(def);
    expect(chartRegistry.all()).toContain(def);
  });

  it('families() lists every registered family', () => {
    const def = stub('__reg_fam_list__', 'composition');
    chartRegistry.register(def);
    expect(chartRegistry.families()).toContain('composition');
  });

  it('count reflects the current registered chart total', () => {
    const before = chartRegistry.count;
    chartRegistry.register(stub('__reg_count__', 'distribution'));
    expect(chartRegistry.count).toBe(before + 1);
  });
});

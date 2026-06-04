import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/population_pyramid';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(count: unknown[] = [10, 12, 20, 25], sex: unknown[] = ['Female', 'Male', 'Female', 'Male']): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { age_band: ['0-9', '0-9', '10-19', '10-19'], sex, count },
    columns: [], rowCount: count.length,
  };
}

const cfg: ChartConfig = { chartType: 'population_pyramid', columns: { age_band: 'age_band', sex: 'sex', count: 'count' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('population_pyramid')!.createRenderer() as EChartsBaseRenderer;
}

describe('population_pyramid registration', () => {
  it('registers age, segment, and count roles', () => {
    const def = chartRegistry.get('population_pyramid')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['age_band', 'sex', 'count']);
  });
});

describe('population_pyramid buildOption', () => {
  it('pivots age bands into mirrored population bars', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['0-9', '10-19']);
    const series = opt.series as Array<{ name: string; data: number[]; itemStyle: { color: string } }>;
    expect(series[0].name).toBe('Female');
    expect(series[1].name).toBe('Male');
    expect(series[0].data).toEqual([-10, -20]);
    expect(series[1].data).toEqual([12, 25]);
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].itemStyle.color).toBe('#0f0');
    const formatter = (opt.xAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter;
    expect(formatter(-25)).toBe('25');
  });

  it('sums duplicate age/segment rows and drops non-finite counts', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        age_band: ['0-9', '0-9', '0-9', '0-9'],
        sex: ['Female', 'Female', 'Male', 'Male'],
        count: [10, 5, 7, NaN],
      },
      columns: [], rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([-15]);
    expect(series[1].data).toEqual([7]);
  });

  it('falls back to a right-side group name when only one segment exists', () => {
    const opt = renderer().buildOption(view([10, 12, 20, 25], ['Only', 'Only', 'Only', 'Only']), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    expect(series[0].name).toBe('Only');
    expect(series[1].name).toBe('Right');
    expect(series[1].data).toEqual([0, 0]);
  });

  it('backfills missing group cells with zeroes', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        age_band: ['0-9', '0-9', '10-19'],
        sex: ['Female', 'Male', 'Male'],
        count: [10, 12, 25],
      },
      columns: [], rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([-10, 0]);
    expect(series[1].data).toEqual([12, 25]);
  });

  it('uses fallback group names when buildOption is called with missing columns', () => {
    const opt = renderer().buildOption({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    expect(series[0].name).toBe('Left');
    expect(series[1].name).toBe('Right');
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });
});

describe('population_pyramid empty guard', () => {
  it('shows an empty state when no finite counts exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No population values to chart');
  });
});

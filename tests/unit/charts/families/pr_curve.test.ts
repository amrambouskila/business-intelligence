import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/pr_curve';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { ColumnMeta, DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function col(name: string, n: number): ColumnMeta {
  return { name, type: 'float', nullable: false, uniqueCount: n, nullCount: 0 };
}

function view(scores: unknown[], labels: unknown[]): DataView {
  return {
    sourceId: 'v', rows: [],
    columnArrays: { score: scores, label: labels },
    columns: [col('score', scores.length), col('label', labels.length)],
    rowCount: scores.length, filters: [],
  };
}

const cfg: ChartConfig = { chartType: 'pr_curve', columns: { score: 'score', label: 'label' }, options: {} };

describe('pr_curve registration', () => {
  it('registers under type "pr_curve" with the statistical family', () => {
    const def = chartRegistry.get('pr_curve');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('Precision-Recall Curve');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['score', 'label']);
    expect(def!.compatibleShapes).toEqual(['two_numeric', 'category_numeric', 'generic']);
  });
});

describe('pr_curve buildOption', () => {
  const renderer = () => chartRegistry.get('pr_curve')!.createRenderer() as EChartsBaseRenderer;

  it('plots a recall/precision line with every precision in [0,1]', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; showSymbol: boolean; data: number[][] }>;
    expect(series[0].type).toBe('line');
    expect(series[0].showSymbol).toBe(false);
    // 4 ranks → 4 points; first two positives drive precision to 1.
    expect(series[0].data).toEqual([[0.5, 1], [1, 1], [1, 2 / 3], [1, 0.5]]);
    for (const [recall, precision] of series[0].data) {
      expect(recall).toBeGreaterThanOrEqual(0);
      expect(recall).toBeLessThanOrEqual(1);
      expect(precision).toBeGreaterThanOrEqual(0);
      expect(precision).toBeLessThanOrEqual(1);
    }
  });

  it('reports average precision in the series name and colors from palette index 0', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; lineStyle: { color: string }; itemStyle: { color: string } }>;
    // perfect separation → AP = 1.000.
    expect(series[0].name).toBe('AP 1.000');
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('names the axes Recall/Precision and pins the y-axis to [0,1]', () => {
    const opt = renderer().buildOption(view([0.9, 0.6], [1, 0]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; name: string }).type).toBe('value');
    expect((opt.xAxis as { name: string }).name).toBe('Recall');
    const yAxis = opt.yAxis as { type: string; name: string; min: number; max: number; axisLine?: unknown };
    expect(yAxis.type).toBe('value');
    expect(yAxis.name).toBe('Precision');
    expect(yAxis.min).toBe(0);
    expect(yAxis.max).toBe(1);
    expect(yAxis.axisLine).toBeUndefined();
  });

  it('drops non-finite scores before computing the curve', () => {
    const opt = renderer().buildOption(view([0.9, NaN, 0.6, Infinity], [1, 1, 0, 1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    // only the two finite scores survive: ranks → P@1=1, P@2=0.5; one positive total.
    expect(series[0].data).toEqual([[1, 1], [1, 0.5]]);
  });

  it('falls back to empty arrays when the referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
  });
});

describe('pr_curve empty-data guard', () => {
  const renderer = () => chartRegistry.get('pr_curve')!.createRenderer() as EChartsBaseRenderer;

  it('renders a themed empty state when no scores are finite', () => {
    const el = renderer().render(view(['a', 'b'], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No scored rows to chart');
  });

  it('treats an all-NaN score column as empty', () => {
    const el = renderer().render(view([NaN, Infinity], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the chart (not the empty state) when finite scores are present', () => {
    const el = renderer().render(view([0.9, 0.6], [1, 0]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });

  it('renders empty when the score column is missing', () => {
    const el = renderer().render(
      view([0.9, 0.6], [1, 0]),
      { chartType: 'pr_curve', columns: { score: 'missing', label: 'label' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });
});

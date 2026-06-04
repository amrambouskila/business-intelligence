import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/roc_curve';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { ColumnType, DataView } from '@/types/data';
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

function view(scores: unknown[], labels: unknown[]): DataView {
  const col = (name: string, type: ColumnType, n: number) => ({
    name, type, nullable: false as const, uniqueCount: n, nullCount: 0,
  });
  return {
    sourceId: 'v', rows: [],
    columnArrays: { s: scores, l: labels },
    columns: [col('s', 'float', scores.length), col('l', 'integer', labels.length)],
    rowCount: scores.length, filters: [],
  };
}

const cfg: ChartConfig = { chartType: 'roc_curve', columns: { score: 's', label: 'l' }, options: {} };

type LineSeries = {
  name: string;
  type: string;
  data: number[][];
  showSymbol: boolean;
  lineStyle: { color: string; type?: string };
  itemStyle: { color: string };
};

const renderer = () => chartRegistry.get('roc_curve')!.createRenderer() as EChartsBaseRenderer;

describe('roc_curve registration', () => {
  it('registers under type "roc_curve" with the statistical family', () => {
    const def = chartRegistry.get('roc_curve');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('ROC Curve');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['score', 'label']);
    expect(def!.compatibleShapes).toEqual(['two_numeric', 'category_numeric', 'generic']);
  });
});

describe('roc_curve buildOption', () => {
  it('plots the ROC line from (0,0) up to (1,1) for a perfect separator', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    expect(series[0].type).toBe('line');
    expect(series[0].showSymbol).toBe(false);
    expect(series[0].data[0]).toEqual([0, 0]);
    expect(series[0].data[series[0].data.length - 1]).toEqual([1, 1]);
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('puts the AUC (1.000 for a perfect separator) in the series name', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    expect(series[0].name).toBe('ROC (AUC 1.000)');
  });

  it('draws the dashed chance diagonal as a second series from [0,0] to [1,1]', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    expect(series[1].name).toBe('Chance');
    expect(series[1].data).toEqual([[0, 0], [1, 1]]);
    expect(series[1].lineStyle.color).toBe('#333');
    expect(series[1].lineStyle.type).toBe('dashed');
    expect(series[1].itemStyle.color).toBe('#333');
  });

  it('builds FPR/TPR value axes and omits the y-axis axisLine', () => {
    const opt = renderer().buildOption(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.xAxis as { name: string }).name).toBe('FPR');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as { name: string }).name).toBe('TPR');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });

  it('drops non-finite scores before pairing with labels', () => {
    const opt = renderer().buildOption(view([0.9, NaN, 0.8, 0.7, 0.6], [1, 1, 1, 0, 0]), cfg, theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    // Three finite scores [0.9,0.8,0.7] pair with labels [1,1,1]; the dropped NaN keeps the
    // remaining pair count at four against labels [1,1,1,0,0] -> 2 pos, 2 neg, AUC 1.000.
    expect(series[0].data[0]).toEqual([0, 0]);
    expect(series[0].data[series[0].data.length - 1]).toEqual([1, 1]);
    expect(series[0].name).toBe('ROC (AUC 1.000)');
  });

  it('falls back to empty labels when the label column is missing', () => {
    const opt = renderer().buildOption(
      view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]),
      { chartType: 'roc_curve', columns: { score: 's', label: 'missing' }, options: {} },
      theme(),
    ) as EChartsOption;
    const series = opt.series as LineSeries[];
    // No labels -> no positives -> degenerate diagonal {(0,0),(1,1)}, AUC 0.500.
    expect(series[0].data).toEqual([[0, 0], [1, 1]]);
    expect(series[0].name).toBe('ROC (AUC 0.500)');
  });
});

describe('roc_curve empty-data guard', () => {
  it('renders a themed empty state when no finite scores are present', () => {
    const el = renderer().render(view(['a', 'b'], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message: string }).message).toBe('No scored rows to chart');
  });

  it('treats an all-NaN score column as empty', () => {
    const el = renderer().render(view([NaN, NaN], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the chart (not the empty state) when finite scores are present', () => {
    const el = renderer().render(view([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });

  it('renders empty when the score column is missing', () => {
    const el = renderer().render(
      view([0.9, 0.8], [1, 0]),
      { chartType: 'roc_curve', columns: { score: 'missing', label: 'l' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });
});

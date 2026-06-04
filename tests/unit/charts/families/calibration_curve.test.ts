import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/calibration_curve';
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

function meta(name: string, n: number): ColumnMeta {
  return { name, type: 'float', nullable: false, uniqueCount: n, nullCount: 0 };
}

function view(scores: unknown[], labels: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { score: scores, label: labels },
    columns: [meta('score', scores.length), meta('label', labels.length)],
    rowCount: Math.max(scores.length, labels.length),
  };
}

const cfg: ChartConfig = { chartType: 'calibration_curve', columns: { score: 'score', label: 'label' }, options: {} };
const renderer = (): EChartsBaseRenderer =>
  chartRegistry.get('calibration_curve')!.createRenderer() as EChartsBaseRenderer;

describe('calibration_curve registration', () => {
  it('registers under type "calibration_curve" with the statistical family', () => {
    const def = chartRegistry.get('calibration_curve');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('Calibration Curve');
    expect(def!.description).toBe('Observed frequency against predicted probability, binned');
    expect(def!.compatibleShapes).toEqual(['two_numeric', 'category_numeric', 'generic']);
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['score', 'label']);
    expect(def!.options?.[0].key).toBe('bins');
    expect(def!.options?.[0].default).toBe(10);
  });
});

describe('calibration_curve buildOption', () => {
  it('plots [meanPredicted, observedRate] per non-empty bin plus a dashed diagonal', () => {
    // bins=10: 0.1→bin1, 0.2→bin2, 0.8→bin8, 0.9→bin9 — four singleton bins.
    // Each bin: meanPredicted = the lone score, observedRate = its label.
    const opt = renderer().buildOption(view([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; data: number[][]; lineStyle: { color: string; type?: string } }>;
    expect(series[0].type).toBe('line');
    expect(series[0].name).toBe('Calibration');
    expect(series[0].data).toEqual([[0.1, 0], [0.2, 0], [0.8, 1], [0.9, 1]]);
    expect(series[0].lineStyle.color).toBe('#f00');

    expect(series[1].name).toBe('Perfect');
    expect(series[1].data).toEqual([[0, 0], [1, 1]]);
    expect(series[1].lineStyle.color).toBe('#333');
    expect(series[1].lineStyle.type).toBe('dashed');
  });

  it('honors the bins option: 2 bins merges scores into low/high halves', () => {
    // bins=2: 0.1,0.2→bin0 (mean 0.15, rate 0); 0.8,0.9→bin1 (mean 0.85, rate 1).
    const opt = renderer().buildOption(
      view([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]),
      { ...cfg, options: { bins: 2 } },
      theme(),
    ) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data.length).toBe(2);
    expect(series[0].data[0][0]).toBeCloseTo(0.15, 12);
    expect(series[0].data[0][1]).toBe(0);
    expect(series[0].data[1][0]).toBeCloseTo(0.85, 12);
    expect(series[0].data[1][1]).toBe(1);
  });

  it('builds Predicted/Observed value axes bounded to [0,1] with no y axisLine', () => {
    const opt = renderer().buildOption(view([0.1, 0.9], [0, 1]), cfg, theme()) as EChartsOption;
    const x = opt.xAxis as Record<string, unknown>;
    const y = opt.yAxis as Record<string, unknown>;
    expect(x.type).toBe('value');
    expect(x.name).toBe('Predicted');
    expect(x.min).toBe(0);
    expect(x.max).toBe(1);
    expect(y.type).toBe('value');
    expect(y.name).toBe('Observed');
    expect(y.min).toBe(0);
    expect(y.max).toBe(1);
    expect(y.axisLine).toBeUndefined();
  });

  it('drops non-finite and out-of-[0,1] scores before binning', () => {
    // NaN and 1.5 are excluded; only 0.2 (bin2) and 0.8 (bin8) remain.
    const opt = renderer().buildOption(
      view([NaN, 0.2, 1.5, 0.8], [1, 0, 0, 1]),
      cfg,
      theme(),
    ) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([[0.2, 0], [0.8, 1]]);
  });

  it('falls back to empty arrays when the referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(
      dv,
      { chartType: 'calibration_curve', columns: { score: 'missing', label: 'gone' }, options: {} },
      theme(),
    ) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
  });
});

describe('calibration_curve empty-data guard', () => {
  it('renders a themed empty state when no finite scored rows exist', () => {
    const el = renderer().render(view([NaN, Infinity], [0, 1]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No scored rows to chart');
  });

  it('treats out-of-range-only scores as empty', () => {
    const el = renderer().render(view([2, -1], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the chart (not the empty state) when a finite in-range score is present', () => {
    const el = renderer().render(view([0.5], [1]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });

  it('treats a non-number score column as empty (each entry maps to NaN)', () => {
    const el = renderer().render(view(['x', 'y'], [1, 0]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders empty when the label column is missing', () => {
    const el = renderer().render(
      view([0.5, 0.8], [1, 0]),
      { chartType: 'calibration_curve', columns: { score: 'score', label: 'missing' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });
});

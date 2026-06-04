import type { EChartsOption, CustomSeriesRenderItem } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ForestRow {
  label: string;
  estimate: number;
  lower: number;
  upper: number;
}

function forestRows(data: DataView, config: ChartConfig): ForestRow[] {
  const labels = data.columnArrays[config.columns['label']] ?? [];
  const estimates = data.columnArrays[config.columns['estimate']] ?? [];
  const lowers = data.columnArrays[config.columns['lower']] ?? [];
  const uppers = data.columnArrays[config.columns['upper']] ?? [];
  const n = Math.min(labels.length, estimates.length, lowers.length, uppers.length);
  const rows: ForestRow[] = [];

  for (let i = 0; i < n; i++) {
    const estimate = estimates[i];
    const lower = lowers[i];
    const upper = uppers[i];
    if (typeof estimate === 'number' && Number.isFinite(estimate)
      && typeof lower === 'number' && Number.isFinite(lower)
      && typeof upper === 'number' && Number.isFinite(upper)) {
      rows.push({ label: String(labels[i]), estimate, lower, upper });
    }
  }

  return rows;
}

function intervalRenderItem(color: string): CustomSeriesRenderItem {
  return (_params, api) => {
    const rowIndex = api.value(0);
    const low = api.coord([api.value(1), rowIndex]);
    const high = api.coord([api.value(2), rowIndex]);
    return {
      type: 'line',
      transition: ['shape'],
      shape: { x1: low[0], y1: low[1], x2: high[0], y2: high[1] },
      style: { stroke: color, lineWidth: 2 },
    };
  };
}

class ForestPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return forestRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No intervals to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = forestRows(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: rows.map((r) => r.label) },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'custom',
          renderItem: intervalRenderItem(color),
          data: rows.map((r, i) => [i, r.lower, r.upper]),
        },
        {
          type: 'scatter',
          data: rows.map((r) => r.estimate),
          symbolSize: 12,
          itemStyle: { color },
        },
      ],
      grid: buildGrid({ left: 120 }),
    };
  }
}

chartRegistry.register({
  type: 'forest_plot',
  family: 'statistical',
  name: 'Forest Plot',
  description: 'Effect estimates with confidence intervals across labels',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
    { role: 'estimate', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Estimate' },
    { role: 'lower', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lower bound' },
    { role: 'upper', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Upper bound' },
  ],
  createRenderer: () => new ForestPlotRenderer(),
});

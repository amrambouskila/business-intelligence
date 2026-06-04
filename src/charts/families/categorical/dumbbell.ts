import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DumbbellRow {
  category: string;
  a: number;
  b: number;
}

function dumbbellRows(data: DataView, config: ChartConfig): DumbbellRow[] {
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const aValues = data.columnArrays[config.columns['value_a']] ?? [];
  const bValues = data.columnArrays[config.columns['value_b']] ?? [];
  const n = Math.min(categories.length, aValues.length, bValues.length);
  const rows: DumbbellRow[] = [];

  for (let i = 0; i < n; i++) {
    const a = aValues[i];
    const b = bValues[i];
    if (typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b)) {
      rows.push({ category: String(categories[i]), a, b });
    }
  }

  return rows;
}

function connectorRenderItem(color: string): CustomSeriesRenderItem {
  return (_params, api) => {
    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);
    return {
      type: 'line',
      transition: ['shape'],
      shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] },
      style: { stroke: color, lineWidth: 2 },
    };
  };
}

class DumbbellRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dumbbellRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No paired values to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = dumbbellRows(data, config);
    const startColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const endColor = categoricalColor(theme.colorScale, 1, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: rows.map((r) => r.category) },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'custom',
          renderItem: connectorRenderItem(theme.axisColor),
          data: rows.map((r, i) => [i, Math.min(r.a, r.b), Math.max(r.a, r.b)]),
        },
        {
          name: 'Value A',
          type: 'scatter',
          data: rows.map((r) => r.a),
          symbolSize: 12,
          itemStyle: { color: startColor },
        },
        {
          name: 'Value B',
          type: 'scatter',
          data: rows.map((r) => r.b),
          symbolSize: 12,
          itemStyle: { color: endColor },
        },
      ],
      grid: buildGrid({ left: 120 }),
    };
  }
}

chartRegistry.register({
  type: 'dumbbell',
  family: 'categorical',
  name: 'Dumbbell Chart',
  description: 'Paired category values connected by a comparison line',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value_a', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value A' },
    { role: 'value_b', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value B' },
  ],
  createRenderer: () => new DumbbellRenderer(),
});

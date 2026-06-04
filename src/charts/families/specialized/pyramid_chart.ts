import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface PyramidRow {
  category: string;
  left: number;
  right: number;
}

function finitePyramidRows(data: DataView, config: ChartConfig): PyramidRow[] {
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const left = data.columnArrays[config.columns['left_value']] ?? [];
  const right = data.columnArrays[config.columns['right_value']] ?? [];
  const out: PyramidRow[] = [];
  for (let i = 0; i < categories.length; i++) {
    const l = left[i];
    const r = right[i];
    if (typeof l === 'number' && Number.isFinite(l) && typeof r === 'number' && Number.isFinite(r)) {
      out.push({ category: String(categories[i]), left: l, right: r });
    }
  }
  return out;
}

class PyramidChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePyramidRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No pyramid values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = finitePyramidRows(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: rows.map((r) => r.category) },
    );
    (axes.xAxis as { axisLabel: Record<string, unknown> }).axisLabel.formatter =
      (value: number) => Math.abs(value).toString();

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      legend: { bottom: 0, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96, bottom: 52 }),
      series: [
        {
          type: 'bar',
          name: 'Left',
          stack: 'pyramid',
          data: rows.map((r) => -Math.abs(r.left)),
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        },
        {
          type: 'bar',
          name: 'Right',
          stack: 'pyramid',
          data: rows.map((r) => Math.abs(r.right)),
          itemStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground) },
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'pyramid_chart',
  family: 'specialized',
  name: 'Pyramid Chart',
  description: 'Mirrored horizontal bars comparing two values by category',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'left_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Left Value' },
    { role: 'right_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Right Value' },
  ],
  createRenderer: () => new PyramidChartRenderer(),
});

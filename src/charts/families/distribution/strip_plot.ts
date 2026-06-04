import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface GroupedPoint {
  label: string;
  value: number;
}

function groupedPoints(data: DataView, config: ChartConfig): GroupedPoint[] {
  const valueData = data.columnArrays[config.columns['value']] ?? [];
  const groupData = data.columnArrays[config.columns['group']] ?? [];
  const n = Math.min(valueData.length, groupData.length);
  const points: GroupedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const value = valueData[i];
    if (Number.isFinite(value)) {
      points.push({ label: String(groupData[i]), value: value as number });
    }
  }

  return points;
}

function labelsInOrder(points: GroupedPoint[]): string[] {
  return Array.from(new Set(points.map((p) => p.label)));
}

class StripPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return groupedPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = groupedPoints(data, config);
    const labels = labelsInOrder(points);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'category', data: labels, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'scatter',
        data: points.map((p) => [p.value, p.label]),
        symbolSize: 7,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.65 },
      }],
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'strip_plot',
  family: 'distribution',
  name: 'Strip Plot',
  description: 'Individual numeric observations separated by category',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new StripPlotRenderer(),
});

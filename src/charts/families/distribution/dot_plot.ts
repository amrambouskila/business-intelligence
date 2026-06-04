import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DotPoint {
  label: string;
  value: number;
}

function dotPoints(data: DataView, config: ChartConfig): DotPoint[] {
  const valueData = data.columnArrays[config.columns['value']] ?? [];
  const groupCol = config.columns['group'];
  const groupData = groupCol ? data.columnArrays[groupCol] ?? [] : [];
  const points: DotPoint[] = [];

  for (let i = 0; i < valueData.length; i++) {
    const value = valueData[i];
    if (!Number.isFinite(value)) continue;
    points.push({ label: groupCol ? String(groupData[i] ?? 'Ungrouped') : 'All', value: value as number });
  }

  return points;
}

function labelsInOrder(points: DotPoint[]): string[] {
  return Array.from(new Set(points.map((p) => p.label)));
}

class DotPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dotPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = dotPoints(data, config);
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
        symbol: 'circle',
        symbolSize: 9,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.8 },
      }],
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'dot_plot',
  family: 'distribution',
  name: 'Dot Plot',
  description: 'Numeric observations shown as dots, optionally grouped by category',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  optionalColumns: [{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }],
  createRenderer: () => new DotPlotRenderer(),
});

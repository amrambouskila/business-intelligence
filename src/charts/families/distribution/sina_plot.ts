import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { kernelDensity } from '@/data/stats/kernelDensity';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface GroupValues {
  label: string;
  values: number[];
}

function groupedValues(data: DataView, config: ChartConfig): GroupValues[] {
  const groups = data.columnArrays[config.columns['group']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(groups.length, values.length);
  const index = new Map<string, number>();
  const result: GroupValues[] = [];

  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (!Number.isFinite(value)) continue;
    const label = String(groups[i]);
    let groupIndex = index.get(label);
    if (groupIndex === undefined) {
      groupIndex = result.length;
      index.set(label, groupIndex);
      result.push({ label, values: [] });
    }
    result[groupIndex].values.push(value as number);
  }

  return result.filter((group) => group.values.length > 0);
}

function densityAt(density: Array<{ x: number; y: number }>, value: number): number {
  return density.reduce((best, point) => (
    Math.abs(point.x - value) < Math.abs(best.x - value) ? point : best
  ), density[0]).y;
}

function sinaData(groups: GroupValues[]): number[][] {
  return groups.flatMap((group, groupIndex) => {
    const density = kernelDensity(group.values, { steps: 40 });
    const maxDensity = density.reduce((max, point) => Math.max(max, point.y), 0);
    return group.values
      .slice()
      .sort((a, b) => a - b)
      .map((value, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const spread = (densityAt(density, value) / maxDensity) * 0.36;
        return [value, groupIndex + side * spread];
      });
  });
}

class SinaPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return groupedValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = groupedValues(data, config);
    const labels = groups.map((group) => group.label);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: {
        ...(axes.yAxis as Record<string, unknown>),
        min: -0.5,
        max: Math.max(labels.length - 0.5, 0.5),
        axisLabel: {
          color: theme.axisColor,
          fontSize: theme.fontSize.small,
          formatter: (value: number) => labels[Math.round(value)] ?? '',
        },
      } as EChartsOption['yAxis'],
      series: [{
        type: 'scatter',
        data: sinaData(groups),
        symbolSize: 7,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.68 },
      }],
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'sina_plot',
  family: 'distribution',
  name: 'Sina Plot',
  description: 'Grouped observations spread by local density',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SinaPlotRenderer(),
});

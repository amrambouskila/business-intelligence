import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface SwarmPoint {
  label: string;
  value: number;
}

function swarmPoints(data: DataView, config: ChartConfig): SwarmPoint[] {
  const groups = data.columnArrays[config.columns['group']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(groups.length, values.length);
  const points: SwarmPoint[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (Number.isFinite(value)) points.push({ label: String(groups[i]), value: value as number });
  }
  return points;
}

function labelsInOrder(points: SwarmPoint[]): string[] {
  return Array.from(new Set(points.map((point) => point.label)));
}

function offsetFor(index: number): number {
  if (index === 0) return 0;
  const ring = Math.ceil(index / 2);
  return (index % 2 === 1 ? 1 : -1) * ring * 0.12;
}

function swarmSeriesData(points: SwarmPoint[], labels: string[]): number[][] {
  const labelIndex = new Map(labels.map((label, i) => [label, i]));
  const withinGroup = new Map<string, number>();
  return [...points]
    .sort((a, b) => a.label.localeCompare(b.label) || a.value - b.value)
    .map((point) => {
      const count = withinGroup.get(point.label) ?? 0;
      withinGroup.set(point.label, count + 1);
      return [point.value, labelIndex.get(point.label)! + offsetFor(count)];
    });
}

class BeeswarmRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return swarmPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = swarmPoints(data, config);
    const labels = labelsInOrder(points);
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
        data: swarmSeriesData(points, labels),
        symbolSize: 7,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.72 },
      }],
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'beeswarm',
  family: 'distribution',
  name: 'Beeswarm Plot',
  description: 'Grouped observations spread into deterministic swarm offsets',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new BeeswarmRenderer(),
});

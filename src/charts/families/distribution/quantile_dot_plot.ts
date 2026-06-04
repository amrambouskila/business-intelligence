import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface QuantileGroup {
  label: string;
  values: number[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

function quantileGroups(data: DataView, config: ChartConfig): QuantileGroup[] {
  const values = data.columnArrays[config.columns['value']] ?? [];
  const groupCol = config.columns['group'];

  if (!groupCol) {
    const finite = values.filter((value): value is number => Number.isFinite(value));
    return finite.length === 0 ? [] : [{ label: 'All', values: finite }];
  }

  const groupData = data.columnArrays[groupCol] ?? [];
  const index = new Map<string, number>();
  const groups: QuantileGroup[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!Number.isFinite(value)) continue;
    const label = String(groupData[i] ?? 'Ungrouped');
    let groupIndex = index.get(label);
    if (groupIndex === undefined) {
      groupIndex = groups.length;
      index.set(label, groupIndex);
      groups.push({ label, values: [] });
    }
    groups[groupIndex].values.push(value as number);
  }
  return groups.filter((group) => group.values.length > 0);
}

function quantileDots(groups: QuantileGroup[]): number[][] {
  return groups.flatMap((group, groupIndex) => {
    const sorted = [...group.values].sort((a, b) => a - b);
    const dotCount = Math.min(25, Math.max(5, sorted.length));
    return Array.from({ length: dotCount }, (_, i) => [
      percentile(sorted, (i + 0.5) / dotCount),
      groupIndex + ((i % 5) - 2) * 0.045,
    ]);
  });
}

class QuantileDotPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return quantileGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = quantileGroups(data, config);
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
        data: quantileDots(groups),
        symbolSize: 8,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.78 },
      }],
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'quantile_dot_plot',
  family: 'distribution',
  name: 'Quantile Dot Plot',
  description: 'Evenly spaced quantile dots for one or more numeric distributions',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  optionalColumns: [{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }],
  createRenderer: () => new QuantileDotPlotRenderer(),
});

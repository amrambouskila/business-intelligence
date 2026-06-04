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

interface DensityGroup {
  label: string;
  values: number[];
}

function densityGroups(data: DataView, config: ChartConfig): DensityGroup[] {
  const valueData = data.columnArrays[config.columns['value']] ?? [];
  const groupCol = config.columns['group'];
  const groupData = groupCol ? data.columnArrays[groupCol] ?? [] : [];

  if (!groupCol) {
    const values = valueData.filter((v): v is number => Number.isFinite(v));
    return values.length > 0 ? [{ label: 'All', values }] : [];
  }

  const index = new Map<string, number>();
  const groups: DensityGroup[] = [];
  for (let i = 0; i < valueData.length; i++) {
    const value = valueData[i];
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

function violinSeries(groups: DensityGroup[], theme: ThemeTokens): EChartsOption['series'] {
  return groups.flatMap((group, index) => {
    const density = kernelDensity(group.values, { steps: 40 });
    const maxDensity = density.reduce((max, point) => Math.max(max, point.y), 0);
    const width = (y: number): number => (y / maxDensity) * 0.35;
    const color = categoricalColor(theme.colorScale, index, theme.foreground);
    const left = density.map((point) => [index - width(point.y), point.x]);
    const right = density.map((point) => [index + width(point.y), point.x]);
    return [
      {
        name: `${group.label} left`,
        type: 'line',
        data: left,
        showSymbol: false,
        lineStyle: { color, width: 2 },
      },
      {
        name: `${group.label} right`,
        type: 'line',
        data: right,
        showSymbol: false,
        lineStyle: { color, width: 2 },
      },
    ];
  }) as EChartsOption['series'];
}

class ViolinPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return densityGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = densityGroups(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', splitLine: false },
      { type: 'value', name: config.columns['value'], nameGap: 45, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: { ...(axes.xAxis as Record<string, unknown>), min: -0.5, max: groups.length - 0.5 },
      yAxis: axes.yAxis,
      series: violinSeries(groups, theme),
      grid: buildGrid({ left: 70, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'violin_plot',
  family: 'distribution',
  name: 'Violin Plot',
  description: 'Mirrored kernel-density outlines for numeric distributions, optionally by group',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  optionalColumns: [{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }],
  createRenderer: () => new ViolinPlotRenderer(),
});

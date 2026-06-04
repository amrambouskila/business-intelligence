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
  if (!(groupCol in data.columnArrays)) return [];
  const groupData = data.columnArrays[groupCol];
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

function joySeries(groups: DensityGroup[], theme: ThemeTokens): EChartsOption['series'] {
  return groups.map((group, index) => {
    const density = kernelDensity(group.values, { steps: 50 });
    const maxDensity = density.reduce((max, point) => Math.max(max, point.y), 0);
    const scale = 0.8 / maxDensity;
    const color = categoricalColor(theme.colorScale, index, theme.foreground);
    return {
      name: group.label,
      type: 'line',
      data: density.map((point) => [point.x, index + point.y * scale]),
      showSymbol: false,
      smooth: true,
      lineStyle: { color, width: 2 },
      areaStyle: { color, opacity: 0.28 },
    };
  }) as EChartsOption['series'];
}

class JoyPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return densityGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = densityGroups(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: -0.1, max: Math.max(groups.length, 1) },
      series: joySeries(groups, theme),
      grid: buildGrid({ left: 70, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'joy_plot',
  family: 'distribution',
  name: 'Joy Plot',
  description: 'Overlapping density ridges for grouped numeric distributions',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new JoyPlotRenderer(),
});

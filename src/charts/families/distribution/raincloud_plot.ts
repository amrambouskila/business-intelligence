import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { kernelDensity } from '@/data/stats/kernelDensity';
import { quantiles } from '@/data/stats/quantiles';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface RainGroup {
  label: string;
  values: number[];
}

function rainGroups(data: DataView, config: ChartConfig): RainGroup[] {
  const groups = data.columnArrays[config.columns['group']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const index = new Map<string, number>();
  const result: RainGroup[] = [];
  const n = Math.min(groups.length, values.length);

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

function rainSeries(groups: RainGroup[], theme: ThemeTokens): EChartsOption['series'] {
  return groups.flatMap((group, index) => {
    const density = kernelDensity(group.values, { steps: 40 });
    const maxDensity = density.reduce((max, point) => Math.max(max, point.y), 0);
    const color = categoricalColor(theme.colorScale, index, theme.foreground);
    const summary = quantiles(group.values);
    const cloud = density.map((point) => [point.x, index + (point.y / maxDensity) * 0.34]);
    const rain = group.values.map((value, i) => [value, index - 0.3 + ((i % 7) - 3) * 0.018]);
    const box = [
      [summary.q1, index - 0.12],
      [summary.q3, index - 0.12],
      [summary.median, index - 0.2],
      [summary.median, index - 0.04],
    ];
    return [
      {
        name: `${group.label} cloud`,
        type: 'line',
        data: cloud,
        showSymbol: false,
        smooth: true,
        lineStyle: { color, width: 2 },
        areaStyle: { color, opacity: 0.22 },
      },
      {
        name: `${group.label} rain`,
        type: 'scatter',
        data: rain,
        symbolSize: 5,
        itemStyle: { color, opacity: 0.5 },
      },
      {
        name: `${group.label} median`,
        type: 'line',
        data: box,
        symbolSize: 0,
        lineStyle: { color, width: 3 },
      },
    ];
  }) as EChartsOption['series'];
}

class RaincloudPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return rainGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = rainGroups(data, config);
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
        min: -0.55,
        max: Math.max(labels.length - 0.35, 0.5),
        axisLabel: {
          color: theme.axisColor,
          fontSize: theme.fontSize.small,
          formatter: (value: number) => labels[Math.round(value)] ?? '',
        },
      } as EChartsOption['yAxis'],
      series: rainSeries(groups, theme),
      grid: buildGrid({ left: 80, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'raincloud_plot',
  family: 'distribution',
  name: 'Raincloud Plot',
  description: 'Grouped density cloud, raw observations, and median summary',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new RaincloudPlotRenderer(),
});

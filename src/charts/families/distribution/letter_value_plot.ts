import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface LetterGroup {
  label: string;
  values: number[];
}

const LEVELS = [
  { name: '50%', lower: 0.25, upper: 0.75, opacity: 0.7 },
  { name: '75%', lower: 0.125, upper: 0.875, opacity: 0.45 },
  { name: '87.5%', lower: 0.0625, upper: 0.9375, opacity: 0.28 },
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

function letterGroups(data: DataView, config: ChartConfig): LetterGroup[] {
  const groups = data.columnArrays[config.columns['group']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const index = new Map<string, number>();
  const result: LetterGroup[] = [];
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

function letterSeries(groups: LetterGroup[], theme: ThemeTokens): EChartsOption['series'] {
  const color = categoricalColor(theme.colorScale, 0, theme.foreground);
  return LEVELS.map((level) => ({
    name: level.name,
    type: 'boxplot',
    data: groups.map((group) => {
      const sorted = [...group.values].sort((a, b) => a - b);
      const low = percentile(sorted, level.lower);
      const median = percentile(sorted, 0.5);
      const high = percentile(sorted, level.upper);
      return [low, low, median, high, high];
    }),
    itemStyle: { color, opacity: level.opacity },
  })) as EChartsOption['series'];
}

class LetterValuePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return letterGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No grouped numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = letterGroups(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: groups.map((group) => group.label) },
      { type: 'value', name: config.columns['value'], nameGap: 45, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: letterSeries(groups, theme),
      grid: buildGrid({ left: 70, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'letter_value_plot',
  family: 'distribution',
  name: 'Letter-Value Plot',
  description: 'Grouped distribution boxes at progressively deeper quantile levels',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new LetterValuePlotRenderer(),
});

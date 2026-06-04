import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import { quantiles } from '@/data/stats/quantiles';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface BoxGroup {
  label: string;
  values: number[];
}

/**
 * Bucket finite numeric values into boxplot groups. With a `group` column, values
 * are grouped by it in first-seen order; otherwise all finite values form one
 * group labeled 'All'. Non-finite values (NaN/Infinity/non-numeric) are dropped.
 */
function boxGroups(data: DataView, config: ChartConfig): BoxGroup[] {
  const valueCol = config.columns['value'];
  const values = data.columnArrays[valueCol] ?? [];
  const groupCol = config.columns['group'];

  if (!groupCol) {
    const finite = values.filter((v): v is number => Number.isFinite(v));
    return finite.length === 0 ? [] : [{ label: 'All', values: finite }];
  }

  const groupData = data.columnArrays[groupCol] ?? [];
  const index = new Map<string, number>();
  const groups: BoxGroup[] = [];
  const n = Math.min(values.length, groupData.length);
  for (let i = 0; i < n; i++) {
    const raw = values[i];
    if (!Number.isFinite(raw)) continue;
    const label = String(groupData[i]);
    let gi = index.get(label);
    if (gi === undefined) {
      gi = groups.length;
      index.set(label, gi);
      groups.push({ label, values: [] });
    }
    groups[gi].values.push(raw as number);
  }
  return groups.filter((g) => g.values.length > 0);
}

class BoxPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return boxGroups(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = boxGroups(data, config);
    const labels = groups.map((g) => g.label);
    const boxes = groups.map((g) => {
      const q = quantiles(g.values);
      return [q.min, q.q1, q.median, q.q3, q.max];
    });

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: labels },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'boxplot',
        data: boxes,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'box_plot',
  family: 'distribution',
  name: 'Box Plot',
  description: 'Five-number-summary boxes of a numeric variable, optionally split by group',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  optionalColumns: [{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }],
  createRenderer: () => new BoxPlotRenderer(),
});

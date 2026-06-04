import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Point = [number, number];

function groupedPoints(data: DataView, config: ChartConfig): Map<string, Point[]> {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const ys = data.columnArrays[config.columns['y']] ?? [];
  const facets = data.columnArrays[config.columns['facet']] ?? [];
  const groups = new Map<string, Point[]>();
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const facet = String(facets[i] ?? 'Ungrouped');
    const points = groups.get(facet) ?? [];
    points.push([x, y]);
    groups.set(facet, points);
  }
  return groups;
}

class FacetedScatterRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return groupedPoints(data, config).size === 0;
  }

  protected emptyMessage(): string {
    return 'No faceted x/y points to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const groups = Array.from(groupedPoints(data, config).entries());
    const columns = Math.ceil(Math.sqrt(groups.length));
    const rows = Math.ceil(groups.length / columns);
    const grid = groups.map((_group, index) => ({
      ...buildGrid({ left: 45, right: 20, top: 35, bottom: 35 }),
      width: `${82 / columns}%`,
      height: `${72 / rows}%`,
      left: `${5 + (index % columns) * (90 / columns)}%`,
      top: `${8 + Math.floor(index / columns) * (82 / rows)}%`,
    }));

    return {
      tooltip: buildTooltip('item'),
      grid,
      xAxis: groups.map(([name], index) => ({
        type: 'value',
        gridIndex: index,
        name,
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        axisLine: { lineStyle: { color: theme.gridColor } },
        splitLine: { lineStyle: { color: theme.gridColor } },
      })),
      yAxis: groups.map((_group, index) => ({
        type: 'value',
        gridIndex: index,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      })),
      series: groups.map(([name, points], index) => ({
        name,
        type: 'scatter',
        xAxisIndex: index,
        yAxisIndex: index,
        data: points,
        symbolSize: 5,
        itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground), opacity: 0.75 },
      })),
    };
  }
}

chartRegistry.register({
  type: 'faceted_scatter',
  family: 'relationships',
  name: 'Faceted Scatter',
  description: 'Small-multiple scatter plots split by a categorical facet',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
    { role: 'facet', acceptedTypes: ['category', 'text'], label: 'Facet' },
  ],
  createRenderer: () => new FacetedScatterRenderer(),
});

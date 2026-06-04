import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type SpineDatum = [number, number, number, number, string, string, number, number];

function spineData(data: DataView, config: ChartConfig): SpineDatum[] {
  const catA = data.columnArrays[config.columns['cat_a']] ?? [];
  const catB = data.columnArrays[config.columns['cat_b']] ?? [];
  const counts = data.columnArrays[config.columns['count']] ?? [];
  const pivot = pivotLongForm(catA, catB, counts);
  const categoryTotals = pivot.keys.map((_, keyIndex) =>
    pivot.matrix.reduce((sum, row) => sum + Math.max(0, row[keyIndex]), 0),
  );
  const grandTotal = categoryTotals.reduce((sum, value) => sum + value, 0);
  if (grandTotal <= 0) return [];

  const rects: SpineDatum[] = [];
  let x = 0;
  for (const [keyIndex, key] of pivot.keys.entries()) {
    const total = categoryTotals[keyIndex];
    const width = (total / grandTotal) * 100;
    const x1 = keyIndex === pivot.keys.length - 1 ? 100 : x + width;
    if (total <= 0 || width <= 0) continue;
    let y = 0;
    for (const [groupIndex, group] of pivot.groups.entries()) {
      const value = Math.max(0, pivot.matrix[groupIndex][keyIndex]);
      if (value <= 0) continue;
      const height = (value / total) * 100;
      const y1 = groupIndex === pivot.groups.length - 1 ? 100 : y + height;
      rects.push([x, x1, y, y1, key, group, value, groupIndex]);
      y += height;
    }
    x += width;
  }
  return rects;
}

function spineRenderItem(theme: ThemeTokens): CustomSeriesRenderItem {
  return (_params, api) => {
    const start = api.coord([api.value(0), api.value(2)]);
    const end = api.coord([api.value(1), api.value(3)]);
    const groupIndex = api.value(7) as number;
    return {
      type: 'rect',
      transition: ['shape'],
      shape: { x: start[0], y: end[1], width: end[0] - start[0], height: start[1] - end[1] },
      style: {
        fill: categoricalColor(theme.colorScale, groupIndex, theme.foreground),
        stroke: theme.background,
        lineWidth: 1,
      },
    };
  };
}

function percentAxis(axis: unknown, theme: ThemeTokens): Record<string, unknown> {
  return {
    ...(axis as Record<string, unknown>),
    min: 0,
    max: 100,
    axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small, formatter: '{value}%' },
  };
}

class SpinePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return spineData(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive counts to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const axes = buildCartesianAxes(
      theme,
      { type: 'value' },
      { type: 'value' },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: percentAxis(axes.xAxis, theme) as EChartsOption['xAxis'],
      yAxis: percentAxis(axes.yAxis, theme) as EChartsOption['yAxis'],
      series: [
        {
          type: 'custom',
          renderItem: spineRenderItem(theme),
          data: spineData(data, config),
          encode: { x: [0, 1], y: [2, 3], tooltip: [4, 5, 6] },
        },
      ],
      grid: buildGrid({ left: 64, right: 24, top: 24, bottom: 48 }),
    };
  }
}

chartRegistry.register({
  type: 'spine_plot',
  family: 'categorical',
  name: 'Spine Plot',
  description: 'Variable-width normalized bars for two categorical variables',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'cat_a', acceptedTypes: ['category', 'text'], label: 'Category A' },
    { role: 'cat_b', acceptedTypes: ['category', 'text'], label: 'Category B' },
    { role: 'count', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Count' },
  ],
  createRenderer: () => new SpinePlotRenderer(),
});

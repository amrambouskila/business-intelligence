import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type MekkoDatum = [number, number, number, number, string, string, number, number];

function categoryWidths(categories: unknown[], widths: unknown[]): Map<string, number> {
  const totals = new Map<string, number>();
  const n = Math.min(categories.length, widths.length);
  for (let i = 0; i < n; i++) {
    const width = widths[i];
    if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
      const category = String(categories[i]);
      totals.set(category, (totals.get(category) ?? 0) + width);
    }
  }
  return totals;
}

function mekkoData(data: DataView, config: ChartConfig): MekkoDatum[] {
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const subgroups = data.columnArrays[config.columns['subgroup']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const widths = data.columnArrays[config.columns['width_metric']] ?? [];
  const pivot = pivotLongForm(categories, subgroups, values);
  const widthByCategory = categoryWidths(categories, widths);
  const totalWidth = pivot.keys.reduce((sum, key) => sum + (widthByCategory.get(key) ?? 0), 0);
  if (totalWidth <= 0) return [];

  const rects: MekkoDatum[] = [];
  let x = 0;
  for (const [keyIndex, key] of pivot.keys.entries()) {
    const width = ((widthByCategory.get(key) ?? 0) / totalWidth) * 100;
    const x1 = keyIndex === pivot.keys.length - 1 ? 100 : x + width;
    const columnTotal = pivot.matrix.reduce((sum, row) => sum + Math.max(0, row[keyIndex]), 0);
    if (width <= 0 || columnTotal <= 0) continue;

    let y = 0;
    for (const [groupIndex, group] of pivot.groups.entries()) {
      const value = Math.max(0, pivot.matrix[groupIndex][keyIndex]);
      if (value <= 0) continue;
      const height = (value / columnTotal) * 100;
      const y1 = groupIndex === pivot.groups.length - 1 ? 100 : y + height;
      rects.push([x, x1, y, y1, key, group, value, groupIndex]);
      y += height;
    }
    x += width;
  }

  return rects;
}

function rectRenderItem(theme: ThemeTokens): CustomSeriesRenderItem {
  return (_params, api) => {
    const x0 = api.value(0) as number;
    const x1 = api.value(1) as number;
    const y0 = api.value(2) as number;
    const y1 = api.value(3) as number;
    const groupIndex = api.value(7) as number;
    const start = api.coord([x0, y0]);
    const end = api.coord([x1, y1]);
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

class MarimekkoRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return mekkoData(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive values and width metric to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rects = mekkoData(data, config);
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
          renderItem: rectRenderItem(theme),
          data: rects,
          encode: { x: [0, 1], y: [2, 3], tooltip: [4, 5, 6] },
        },
      ],
      grid: buildGrid({ left: 64, right: 24, top: 24, bottom: 48 }),
    };
  }
}

chartRegistry.register({
  type: 'marimekko',
  family: 'categorical',
  name: 'Marimekko Chart',
  description: 'Variable-width stacked columns comparing subgroup mix and category size',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    { role: 'width_metric', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Width metric' },
  ],
  createRenderer: () => new MarimekkoRenderer(),
});

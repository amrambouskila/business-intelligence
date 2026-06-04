import type { EChartsOption, CustomSeriesRenderItem } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ErrorBarRow {
  category: string;
  estimate: number;
  lower: number;
  upper: number;
}

/** Keep only rows whose estimate, lower, and upper are all finite. */
function errorBarRows(data: DataView, config: ChartConfig): ErrorBarRow[] {
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const estimates = data.columnArrays[config.columns['estimate']] ?? [];
  const lowers = data.columnArrays[config.columns['lower']] ?? [];
  const uppers = data.columnArrays[config.columns['upper']] ?? [];

  const n = Math.min(categories.length, estimates.length, lowers.length, uppers.length);
  const rows: ErrorBarRow[] = [];
  for (let i = 0; i < n; i++) {
    const estimate = estimates[i];
    const lower = lowers[i];
    const upper = uppers[i];
    if (!Number.isFinite(estimate) || !Number.isFinite(lower) || !Number.isFinite(upper)) continue;
    rows.push({
      category: String(categories[i]),
      estimate: estimate as number,
      lower: lower as number,
      upper: upper as number,
    });
  }
  return rows;
}

/**
 * Draw the [lower, upper] whisker as a vertical line at the category's x.
 * Each datum is [categoryIndex, lower, upper]; api.coord maps the category index
 * to the band center and the bounds to pixel y on the value axis.
 */
function whiskerRenderItem(color: string): CustomSeriesRenderItem {
  return (_params, api) => {
    const categoryIndex = api.value(0);
    const x = api.coord([categoryIndex, api.value(1)])[0];
    const bottom = api.coord([categoryIndex, api.value(1)])[1];
    const top = api.coord([categoryIndex, api.value(2)])[1];
    return {
      type: 'line',
      transition: ['shape'],
      shape: { x1: x, y1: top, x2: x, y2: bottom },
      style: { stroke: color, lineWidth: 2 },
    };
  };
}

class ErrorBarRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return errorBarRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No estimates to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = errorBarRows(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: rows.map((r) => r.category) },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'custom',
          renderItem: whiskerRenderItem(color),
          data: rows.map((r, i) => [i, r.lower, r.upper]),
        },
        {
          type: 'scatter',
          data: rows.map((r) => r.estimate),
          itemStyle: { color },
        },
      ],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'error_bar',
  family: 'statistical',
  name: 'Error Bar Chart',
  description: 'Category estimates with lower/upper confidence whiskers',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'estimate', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Estimate' },
    { role: 'lower', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lower bound' },
    { role: 'upper', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Upper bound' },
  ],
  createRenderer: () => new ErrorBarRenderer(),
});

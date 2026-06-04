import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function facetCategoryValues(data: DataView, config: ChartConfig): Map<string, Map<string, number>> {
  const facets = data.columnArrays[config.columns['facet']] ?? [];
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const out = new Map<string, Map<string, number>>();

  for (let i = 0; i < Math.min(facets.length, categories.length, values.length); i++) {
    const value = values[i];
    if (facets[i] == null || categories[i] == null || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const facet = String(facets[i]);
    const category = String(categories[i]);
    const byCategory = out.get(facet) ?? new Map<string, number>();
    byCategory.set(category, (byCategory.get(category) ?? 0) + value);
    out.set(facet, byCategory);
  }

  return out;
}

class SmallMultiplesRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return facetCategoryValues(data, config).size === 0;
  }

  protected emptyMessage(): string {
    return 'No faceted values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const facets = Array.from(facetCategoryValues(data, config).entries());
    const categorySet = new Set<string>();
    for (const [, values] of facets) for (const category of values.keys()) categorySet.add(category);
    const categories = Array.from(categorySet);
    const columns = Math.ceil(Math.sqrt(facets.length));
    const rows = Math.ceil(facets.length / columns);

    return {
      tooltip: buildTooltip('axis'),
      grid: facets.map((_facet, index) => ({
        ...buildGrid({ left: 36, right: 14, top: 32, bottom: 30 }),
        width: `${82 / columns}%`,
        height: `${72 / rows}%`,
        left: `${6 + (index % columns) * (90 / columns)}%`,
        top: `${8 + Math.floor(index / columns) * (82 / rows)}%`,
      })),
      xAxis: facets.map(([facet], index) => ({
        type: 'category',
        gridIndex: index,
        data: categories,
        name: facet,
        nameLocation: 'middle',
        nameGap: 22,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        axisLine: { lineStyle: { color: theme.gridColor } },
      })),
      yAxis: facets.map((_facet, index) => ({
        type: 'value',
        gridIndex: index,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      })),
      series: facets.map(([facet, values], index) => ({
        name: facet,
        type: 'bar',
        xAxisIndex: index,
        yAxisIndex: index,
        data: categories.map((category) => values.get(category) ?? 0),
        itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground) },
      })),
    };
  }
}

chartRegistry.register({
  type: 'small_multiples',
  family: 'specialized',
  name: 'Small Multiples',
  description: 'Repeated mini charts split by a categorical facet',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'facet', acceptedTypes: ['category', 'text'], label: 'Facet' },
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SmallMultiplesRenderer(),
});

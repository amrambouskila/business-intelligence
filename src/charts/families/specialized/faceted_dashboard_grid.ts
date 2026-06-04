import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DashboardFacet {
  name: string;
  total: number;
  categories: Array<{ name: string; value: number }>;
}

function dashboardFacets(data: DataView, config: ChartConfig): DashboardFacet[] {
  const facets = data.columnArrays[config.columns['facet']] ?? [];
  const categories = data.columnArrays[config.columns['category']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const byFacet = new Map<string, Map<string, number>>();

  for (let i = 0; i < Math.min(facets.length, categories.length, values.length); i++) {
    const value = values[i];
    if (facets[i] == null || categories[i] == null || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const facet = String(facets[i]);
    const category = String(categories[i]);
    const byCategory = byFacet.get(facet) ?? new Map<string, number>();
    byCategory.set(category, (byCategory.get(category) ?? 0) + value);
    byFacet.set(facet, byCategory);
  }

  return Array.from(byFacet.entries()).map(([name, byCategory]) => {
    const categoriesOut = Array.from(byCategory.entries())
      .map(([categoryName, value]) => ({ name: categoryName, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return {
      name,
      total: categoriesOut.reduce((sum, row) => sum + row.value, 0),
      categories: categoriesOut,
    };
  });
}

class FacetedDashboardGridRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dashboardFacets(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No dashboard facets to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const facets = dashboardFacets(data, config).slice(0, 6);
    const columns = Math.ceil(Math.sqrt(facets.length));
    const cardWidth = 190;
    const cardHeight = 112;
    const maxCategoryValue = facets
      .flatMap((facet) => facet.categories.map((category) => category.value))
      .reduce((max, value) => (value > max ? value : max), 0);

    return {
      graphic: [{
        type: 'group',
        left: 24,
        top: 22,
        children: facets.flatMap((facet, index) => {
          const x = (index % columns) * (cardWidth + 22);
          const y = Math.floor(index / columns) * (cardHeight + 18);
          const accent = categoricalColor(theme.colorScale, index, theme.foreground);
          return [
            {
              type: 'rect',
              shape: { x, y, width: cardWidth, height: cardHeight },
              style: { fill: theme.background, stroke: theme.gridColor, lineWidth: 1 },
            },
            {
              type: 'text',
              x: x + 12,
              y: y + 10,
              style: { text: facet.name, fill: theme.foreground, font: `600 ${theme.fontSize.medium}px ${theme.fontFamily}` },
            },
            {
              type: 'text',
              x: x + 12,
              y: y + 34,
              style: {
                text: facet.total.toLocaleString(undefined, { maximumFractionDigits: 1 }),
                fill: accent,
                font: `700 ${theme.fontSize.large}px ${theme.fontFamily}`,
              },
            },
            ...facet.categories.slice(0, 4).flatMap((category, categoryIndex) => {
              const barY = y + 62 + categoryIndex * 18;
              const width = maxCategoryValue <= 0 ? 0 : (category.value / maxCategoryValue) * 76;
              return [
                {
                  type: 'text',
                  x: x + 12,
                  y: barY - 1,
                  style: {
                    text: category.name,
                    fill: theme.axisColor,
                    font: `${theme.fontSize.small}px ${theme.fontFamily}`,
                    width: 62,
                    overflow: 'truncate',
                  },
                },
                {
                  type: 'rect',
                  shape: { x: x + 78, y: barY, width, height: 8 },
                  style: { fill: accent },
                },
              ];
            }),
          ];
        }),
      }],
    };
  }
}

chartRegistry.register({
  type: 'faceted_dashboard_grid',
  family: 'specialized',
  name: 'Faceted Dashboard Grid',
  description: 'Facet-level KPI cards with compact category breakdown bars',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'facet', acceptedTypes: ['category', 'text'], label: 'Facet' },
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new FacetedDashboardGridRenderer(),
});

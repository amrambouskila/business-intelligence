import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface MosaicNode {
  name: string;
  value: number;
  children?: MosaicNode[];
  itemStyle?: { color: string };
}

function mosaicData(data: DataView, config: ChartConfig, theme: ThemeTokens): MosaicNode[] {
  return buildMosaicData(data, config, theme);
}

function buildMosaicData(data: DataView, config: ChartConfig, theme?: ThemeTokens): MosaicNode[] {
  const catA = data.columnArrays[config.columns['cat_a']] ?? [];
  const catB = data.columnArrays[config.columns['cat_b']] ?? [];
  const count = data.columnArrays[config.columns['count']] ?? [];
  const pivot = pivotLongForm(catA, catB, count);

  return pivot.keys
    .map((key, keyIndex) => {
      const children = pivot.groups
        .map((group, groupIndex) => ({
          name: group,
          value: pivot.matrix[groupIndex][keyIndex],
          ...(theme ? { itemStyle: { color: categoricalColor(theme.colorScale, groupIndex, theme.foreground) } } : {}),
        }))
        .filter((node) => node.value > 0);
      const value = children.reduce((sum, node) => sum + node.value, 0);
      return {
        name: key,
        value,
        children,
        ...(theme ? { itemStyle: { color: categoricalColor(theme.colorScale, keyIndex, theme.foreground) } } : {}),
      };
    })
    .filter((node) => node.value > 0);
}

class MosaicPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildMosaicData(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive counts to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    return {
      tooltip: buildTooltip('item'),
      series: [
        {
          type: 'treemap',
          data: mosaicData(data, config, theme),
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: { color: theme.foreground, fontFamily: theme.fontFamily, fontSize: theme.fontSize.small },
          upperLabel: { show: true, height: 20, color: theme.foreground },
          itemStyle: { borderColor: theme.background, borderWidth: 2 },
          levels: [
            { itemStyle: { borderColor: theme.background, borderWidth: 3, gapWidth: 3 } },
            { itemStyle: { borderColor: theme.background, borderWidth: 1, gapWidth: 1 } },
          ],
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'mosaic_plot',
  family: 'categorical',
  name: 'Mosaic Plot',
  description: 'Contingency-table proportions encoded as nested area rectangles',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'cat_a', acceptedTypes: ['category', 'text'], label: 'Category A' },
    { role: 'cat_b', acceptedTypes: ['category', 'text'], label: 'Category B' },
    { role: 'count', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Count' },
  ],
  createRenderer: () => new MosaicPlotRenderer(),
});

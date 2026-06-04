import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function hierarchyColumns(data: DataView, config: ChartConfig): [unknown[], unknown[], unknown[]] {
  return [
    data.columnArrays[config.columns['id']] ?? [],
    data.columnArrays[config.columns['parent']] ?? [],
    data.columnArrays[config.columns['value']] ?? [],
  ];
}

class CompositionTreemapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildHierarchy(...hierarchyColumns(data, config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No hierarchy values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'treemap',
        data: buildHierarchy(...hierarchyColumns(data, config)),
        label: { color: theme.foreground },
        breadcrumb: { itemStyle: { textStyle: { color: theme.foreground } } },
      }],
    };
  }
}

chartRegistry.register({
  type: 'composition_treemap',
  family: 'composition',
  name: 'Composition Treemap',
  description: 'Hierarchical part-to-whole composition as nested rectangles',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionTreemapRenderer(),
});

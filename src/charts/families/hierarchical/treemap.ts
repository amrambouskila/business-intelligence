import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class TreemapRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = this.buildTree(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{ type: 'treemap', data: tree, label: { color: theme.foreground } }],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return this.buildTree(data, config).length === 0;
  }

  private buildTree(data: DataView, config: ChartConfig) {
    const idCol = config.columns['id'];
    const parentCol = config.columns['parent'];
    const valueCol = config.columns['value'];
    const idData = data.columnArrays[idCol] ?? [];
    const parentData = data.columnArrays[parentCol] ?? [];
    const valueData = data.columnArrays[valueCol] ?? [];
    return buildHierarchy(idData, parentData, valueData);
  }
}

chartRegistry.register({
  type: 'treemap',
  family: 'hierarchical',
  name: 'Treemap',
  description: 'Nested rectangles sized by value, encoding a hierarchy from id/parent links',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new TreemapRenderer(),
});

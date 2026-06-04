import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class TreeRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = this.buildTree(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [
        {
          type: 'tree',
          data: tree,
          layout: 'orthogonal',
          expandAndCollapse: true,
          label: { color: theme.foreground },
          lineStyle: { color: theme.gridColor },
        },
      ],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return this.buildTree(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No hierarchy to chart';
  }

  private buildTree(data: DataView, config: ChartConfig) {
    const idData = data.columnArrays[config.columns['id']] ?? [];
    const parentData = data.columnArrays[config.columns['parent']] ?? [];
    const valueCol = config.columns['value'];
    const valueData = valueCol !== undefined ? (data.columnArrays[valueCol] ?? []) : idData.map(() => 1);
    return buildHierarchy(idData, parentData, valueData);
  }
}

chartRegistry.register({
  type: 'tree',
  family: 'hierarchical',
  name: 'Node-Link Tree',
  description: 'Hierarchy drawn as a node-link tree from id/parent links',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
  ],
  optionalColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new TreeRenderer(),
});

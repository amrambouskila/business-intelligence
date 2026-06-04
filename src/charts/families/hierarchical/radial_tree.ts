import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class RadialTreeRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = this.buildTree(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'tree',
        data: tree,
        layout: 'radial',
        symbolSize: 8,
        expandAndCollapse: true,
        label: { color: theme.foreground },
        lineStyle: { color: theme.gridColor },
      }],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return this.buildTree(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No hierarchy to chart';
  }

  private buildTree(data: DataView, config: ChartConfig) {
    const valueCol = config.columns['value'];
    const ids = data.columnArrays[config.columns['id']] ?? [];
    return buildHierarchy(
      ids,
      data.columnArrays[config.columns['parent']] ?? [],
      valueCol !== undefined ? (data.columnArrays[valueCol] ?? []) : ids.map(() => 1),
    );
  }
}

chartRegistry.register({
  type: 'radial_tree',
  family: 'hierarchical',
  name: 'Radial Tree',
  description: 'Hierarchy drawn as a radial node-link tree',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
  ],
  optionalColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new RadialTreeRenderer(),
});

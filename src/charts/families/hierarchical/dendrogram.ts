import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class DendrogramRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = this.buildTree(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'tree',
        data: tree,
        layout: 'orthogonal',
        orient: 'LR',
        symbol: 'emptyCircle',
        symbolSize: 7,
        expandAndCollapse: false,
        label: { color: theme.foreground, position: 'left', verticalAlign: 'middle', align: 'right' },
        leaves: { label: { color: theme.foreground, position: 'right', verticalAlign: 'middle', align: 'left' } },
        lineStyle: { color: theme.gridColor, width: 1.5 },
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
  type: 'dendrogram',
  family: 'hierarchical',
  name: 'Dendrogram',
  description: 'Cluster-style hierarchy tree from id/parent links',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
  ],
  optionalColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new DendrogramRenderer(),
});

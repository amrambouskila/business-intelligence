import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class PartitionChartRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = this.buildTree(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'sunburst',
        data: tree,
        radius: ['0%', '92%'],
        sort: undefined,
        label: { color: theme.foreground },
        itemStyle: { borderColor: theme.background, borderWidth: 1 },
        levels: [
          {},
          { r0: '0%', r: '34%' },
          { r0: '34%', r: '66%' },
          { r0: '66%', r: '92%' },
        ],
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
    return buildHierarchy(
      data.columnArrays[config.columns['id']] ?? [],
      data.columnArrays[config.columns['parent']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
  }
}

chartRegistry.register({
  type: 'partition_chart',
  family: 'hierarchical',
  name: 'Partition Chart',
  description: 'Space-filling hierarchy partition with horizontal bands sized by value',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new PartitionChartRenderer(),
});

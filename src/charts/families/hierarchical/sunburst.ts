import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class SunburstRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const tree = buildHierarchy(...this.columns(data, config));
    return {
      tooltip: buildTooltip('item'),
      series: [{ type: 'sunburst', data: tree, label: { color: theme.foreground } }],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildHierarchy(...this.columns(data, config)).length === 0;
  }

  private columns(data: DataView, config: ChartConfig): [unknown[], unknown[], unknown[]] {
    const idCol = config.columns['id'];
    const parentCol = config.columns['parent'];
    const valueCol = config.columns['value'];
    return [data.columnArrays[idCol] ?? [], data.columnArrays[parentCol] ?? [], data.columnArrays[valueCol] ?? []];
  }
}

chartRegistry.register({
  type: 'sunburst',
  family: 'hierarchical',
  name: 'Sunburst',
  description: 'Radial hierarchy of nested rings sized by value',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SunburstRenderer(),
});

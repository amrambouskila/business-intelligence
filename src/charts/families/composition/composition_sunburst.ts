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

class CompositionSunburstRenderer extends EChartsBaseRenderer {
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
        type: 'sunburst',
        data: buildHierarchy(...hierarchyColumns(data, config)),
        radius: ['8%', '86%'],
        label: { color: theme.foreground },
      }],
    };
  }
}

chartRegistry.register({
  type: 'composition_sunburst',
  family: 'composition',
  name: 'Composition Sunburst',
  description: 'Hierarchical part-to-whole composition as radial rings',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionSunburstRenderer(),
});

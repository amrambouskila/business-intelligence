import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { columnExtents, finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];

class ParallelCoordinatesRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ROLES).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric feature rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const input = finiteNumericRows(data, config, ROLES);
    const ranges = columnExtents(input.rows);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    return {
      tooltip: buildTooltip('item'),
      parallelAxis: input.names.map((name, dim) => ({ dim, name, min: ranges[dim].min, max: ranges[dim].max, nameTextStyle: { color: theme.foreground }, axisLine: { lineStyle: { color: theme.axisColor } }, axisLabel: { color: theme.axisColor } })),
      parallel: { left: 55, right: 40, top: 40, bottom: 35, parallelAxisDefault: { type: 'value' } },
      series: [{ name: 'Rows', type: 'parallel', data: input.rows.slice(0, 120), lineStyle: { color, opacity: 0.35, width: 1.5 } }],
    };
  }
}

chartRegistry.register({
  type: 'parallel_coordinates',
  family: 'relationships',
  name: 'Parallel Coordinates',
  description: 'Multivariate rows plotted across parallel numeric axes',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new ParallelCoordinatesRenderer(),
});

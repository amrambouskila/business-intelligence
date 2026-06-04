import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];

class ScatterMatrixRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ROLES).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric feature rows to compare';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const input = finiteNumericRows(data, config, ROLES);
    const size = input.names.length;
    const gap = 4;
    const cell = (100 - gap * (size + 1)) / size;
    const grids = input.names.flatMap((_yName, row) => input.names.map((_xName, col) => ({ left: `${gap + col * (cell + gap)}%`, top: `${gap + row * (cell + gap)}%`, width: `${cell}%`, height: `${cell}%` })));
    const axes = input.names.flatMap((name, i) => input.names.map((_other, j) => ({ type: 'value' as const, gridIndex: i * size + j, name: i === size - 1 ? name : '', nameTextStyle: { color: theme.foreground }, axisLabel: { color: theme.axisColor, show: i === size - 1 || j === 0 }, axisLine: { lineStyle: { color: theme.axisColor } }, splitLine: { lineStyle: { color: theme.gridColor } } })));
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    return {
      tooltip: buildTooltip('item'),
      grid: grids,
      xAxis: axes,
      yAxis: axes.map((axis, i) => ({ ...axis, name: i % size === 0 ? input.names[Math.floor(i / size)] : '' })),
      series: input.names.flatMap((_yName, row) => input.names.map((_xName, col) => ({
        name: `${input.names[col]} vs ${input.names[row]}`,
        type: 'scatter',
        xAxisIndex: row * size + col,
        yAxisIndex: row * size + col,
        data: input.rows.map((values) => [values[col], values[row]]),
        symbolSize: row === col ? 3 : 5,
        itemStyle: { color, opacity: row === col ? 0.25 : 0.6 },
      }))),
    };
  }
}

chartRegistry.register({
  type: 'scatter_matrix',
  family: 'relationships',
  name: 'Scatter Matrix / Pair Plot',
  description: 'Pairwise scatter matrix for three numeric feature columns',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new ScatterMatrixRenderer(),
});

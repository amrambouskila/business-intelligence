import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { histogramBins } from '@/charts/echarts/histogramBins';
import { finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];
const DIAGONAL_BINS = 8;

class PairPlotRenderer extends EChartsBaseRenderer {
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
    const grids = input.names.flatMap((_yName, row) => input.names.map((_xName, col) => ({
      left: `${gap + col * (cell + gap)}%`,
      top: `${gap + row * (cell + gap)}%`,
      width: `${cell}%`,
      height: `${cell}%`,
    })));
    const axes = input.names.flatMap((name, row) => input.names.map((_other, col) => ({
      type: 'value' as const,
      gridIndex: row * size + col,
      name: row === size - 1 ? name : '',
      nameTextStyle: { color: theme.foreground },
      axisLabel: { color: theme.axisColor, show: row === size - 1 || col === 0 },
      axisLine: { lineStyle: { color: theme.axisColor } },
      splitLine: { lineStyle: { color: theme.gridColor } },
    })));
    const scatterColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const histogramColor = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('item'),
      grid: grids,
      xAxis: axes,
      yAxis: axes.map((axis, i) => ({ ...axis, name: i % size === 0 ? input.names[Math.floor(i / size)] : '' })),
      series: input.names.flatMap((_yName, row) => input.names.map((_xName, col) => {
        const index = row * size + col;
        if (row === col) {
          const bins = histogramBins(input.rows.map((values) => values[col]), DIAGONAL_BINS);
          return {
            name: `${input.names[col]} distribution`,
            type: 'bar',
            xAxisIndex: index,
            yAxisIndex: index,
            data: bins.binCenters.map((center, i) => [center, bins.counts[i]]),
            barWidth: '70%',
            itemStyle: { color: histogramColor, opacity: 0.75 },
          };
        }
        return {
          name: `${input.names[col]} vs ${input.names[row]}`,
          type: 'scatter',
          xAxisIndex: index,
          yAxisIndex: index,
          data: input.rows.map((values) => [values[col], values[row]]),
          symbolSize: 5,
          itemStyle: { color: scatterColor, opacity: 0.6 },
        };
      })),
    };
  }
}

chartRegistry.register({
  type: 'pair_plot',
  family: 'relationships',
  name: 'Pair Plot',
  description: 'Pairwise scatter cells with per-feature distributions on the diagonal',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new PairPlotRenderer(),
});

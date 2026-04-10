import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class HistogramRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const col = config.columns['value'];
    const values = (data.columnArrays[col] ?? []).filter((v): v is number => typeof v === 'number');
    const bins = (config.options['bins'] as number) ?? 30;

    // Compute histogram bins (use reduce to avoid stack overflow on large arrays)
    const min = values.reduce((a, b) => a < b ? a : b, Infinity);
    const max = values.reduce((a, b) => a > b ? a : b, -Infinity);
    const binWidth = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    const edges: number[] = [];

    for (let i = 0; i <= bins; i++) {
      edges.push(min + i * binWidth);
    }
    for (const v of values) {
      const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
      counts[idx]++;
    }

    const labels = edges.slice(0, -1).map((e, i) => `${e.toFixed(1)} - ${edges[i + 1].toFixed(1)}`);

    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small, rotate: 45 },
        axisLine: { lineStyle: { color: theme.gridColor } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: { color: theme.colorScale[0] },
        barWidth: '90%',
      }],
      grid: { left: 60, right: 20, top: 20, bottom: 60 },
    };
  }
}

chartRegistry.register({
  type: 'histogram',
  family: 'distribution',
  name: 'Histogram',
  description: 'Frequency distribution of a single numeric variable',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'many_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new HistogramRenderer(),
});

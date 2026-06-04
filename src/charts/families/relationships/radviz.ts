import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteNumericRows, radvizPoints } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];

class RadVizRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ROLES).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric feature rows to project';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const input = finiteNumericRows(data, config, ROLES);
    const points = radvizPoints(input);
    const anchors = input.names.map((name, i) => {
      const angle = (i / input.names.length) * Math.PI * 2 - Math.PI / 2;
      return { name, value: [Math.cos(angle), Math.sin(angle)] };
    });
    return {
      tooltip: buildTooltip('item'),
      xAxis: { type: 'value', min: -1.1, max: 1.1, axisLine: { lineStyle: { color: theme.axisColor } }, axisLabel: { color: theme.axisColor }, splitLine: { show: false } },
      yAxis: { type: 'value', min: -1.1, max: 1.1, axisLine: { show: false }, axisLabel: { color: theme.axisColor }, splitLine: { show: false } },
      series: [
        { name: 'Projected rows', type: 'scatter', data: points, symbolSize: 5, itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.6 } },
        { name: 'Feature anchors', type: 'scatter', data: anchors, symbolSize: 12, label: { show: true, formatter: '{b}', color: theme.foreground, position: 'top' }, itemStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground) } },
      ],
      grid: buildGrid({ bottom: 45 }),
    };
  }
}

chartRegistry.register({
  type: 'radviz',
  family: 'relationships',
  name: 'RadViz',
  description: 'Radial visualization projection of multivariate numeric rows',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new RadVizRenderer(),
});

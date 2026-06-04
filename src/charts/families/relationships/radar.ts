import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface MetricValue {
  metric: string;
  value: number;
}

function values(data: DataView, config: ChartConfig): MetricValue[] {
  const metrics = data.columnArrays[config.columns['metric']] ?? [];
  const nums = data.columnArrays[config.columns['value']] ?? [];
  const out: MetricValue[] = [];
  for (let i = 0; i < Math.min(metrics.length, nums.length); i++) {
    const value = nums[i];
    if (typeof value === 'number' && Number.isFinite(value)) out.push({ metric: String(metrics[i]), value });
  }
  return out;
}

class RadarRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return values(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No metric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = values(data, config);
    const max = rows.reduce((current, row) => Math.max(current, row.value), 0);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    return {
      tooltip: buildTooltip('item'),
      radar: {
        indicator: rows.map((row) => ({ name: row.metric, max })),
        axisName: { color: theme.foreground, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
        splitArea: { areaStyle: { color: ['transparent'] } },
        axisLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [{
        name: 'Metric values',
        type: 'radar',
        data: [{ value: rows.map((row) => row.value), name: config.columns['value'] }],
        itemStyle: { color },
        areaStyle: { color, opacity: 0.16 },
        lineStyle: { color, width: 2 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'radar',
  family: 'relationships',
  name: 'Radar / Spider Chart',
  description: 'Metric/value profile shown on radial axes',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'metric', acceptedTypes: ['category', 'text'], label: 'Metric' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new RadarRenderer(),
});

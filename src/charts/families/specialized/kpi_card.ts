import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface KpiValue {
  name: string;
  value: number;
}

function finiteKpis(data: DataView, config: ChartConfig): KpiValue[] {
  const names = data.columnArrays[config.columns['metric_name']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const out: KpiValue[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ name: String(names[i]), value });
    }
  }
  return out;
}

class KpiCardRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteKpis(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No KPI value to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const kpi = finiteKpis(data, config)[0];
    const accent = categoricalColor(theme.colorScale, 0, theme.foreground);

    return {
      graphic: [{
        type: 'group',
        left: 'center',
        top: 'middle',
        children: [
          {
            type: 'text',
            style: {
              text: kpi.name,
              fill: theme.axisColor,
              font: `${theme.fontSize.large}px ${theme.fontFamily}`,
              align: 'center',
            },
          },
          {
            type: 'text',
            top: 34,
            style: {
              text: kpi.value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
              fill: accent,
              font: `700 ${theme.fontSize.large * 3}px ${theme.fontFamily}`,
              align: 'center',
            },
          },
        ],
      }],
    };
  }
}

chartRegistry.register({
  type: 'kpi_card',
  family: 'specialized',
  name: 'KPI Card',
  description: 'Single metric value displayed as a compact KPI card',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'metric_name', acceptedTypes: ['category', 'text'], label: 'Metric' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new KpiCardRenderer(),
});

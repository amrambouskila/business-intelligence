import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface StageValue {
  name: string;
  value: number;
}

function finiteStageValues(data: DataView, config: ChartConfig): StageValue[] {
  const stages = data.columnArrays[config.columns['stage']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const out: StageValue[] = [];
  for (let i = 0; i < stages.length; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ name: String(stages[i]), value });
    }
  }
  return out;
}

class FunnelAreaRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteStageValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No funnel values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dataPoints = finiteStageValues(data, config).map((s, i) => ({
      name: s.name,
      value: s.value,
      itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
    }));

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'funnel',
        sort: 'descending',
        minSize: '20%',
        maxSize: '90%',
        label: { position: 'inside', color: theme.foreground },
        data: dataPoints,
      }],
    };
  }
}

chartRegistry.register({
  type: 'funnel_area',
  family: 'specialized',
  name: 'Funnel Area Chart',
  description: 'Funnel stages drawn as area-scaled slices',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'stage', acceptedTypes: ['category', 'text'], label: 'Stage' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new FunnelAreaRenderer(),
});

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

/** Finite (stage, value) pairs — non-finite values dropped, stage stringified. */
function finiteStageValues(data: DataView, config: ChartConfig): StageValue[] {
  const stages = data.columnArrays[config.columns['stage']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const out: StageValue[] = [];
  for (let i = 0; i < stages.length; i++) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ name: String(stages[i]), value: v });
  }
  return out;
}

class FunnelRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = finiteStageValues(data, config);
    const seriesData = pairs.map((s, i) => ({
      name: s.name,
      value: s.value,
      itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
    }));

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'funnel',
        sort: 'descending',
        data: seriesData,
      }],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteStageValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }
}

chartRegistry.register({
  type: 'funnel',
  family: 'network-flow',
  name: 'Funnel Chart',
  description: 'Stage progression where each stage is a slice sized by its value',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'stage', acceptedTypes: ['category', 'text'], label: 'Stage' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new FunnelRenderer(),
});

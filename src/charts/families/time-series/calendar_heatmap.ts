import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * ISO yyyy-MM-dd for a raw date value, or null when unparseable. Uses the UTC
 * getters because date-only strings ('2023-01-15') parse as UTC midnight; the
 * local getters would shift the cell a day earlier in any timezone west of UTC.
 */
function toIsoDate(raw: unknown): string | null {
  const d = new Date(raw as string | number | Date);
  const time = d.getTime();
  if (!Number.isFinite(time)) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

class CalendarHeatmapRenderer extends EChartsBaseRenderer {
  private pairs(data: DataView, config: ChartConfig): [string, number][] {
    const dateData = data.columnArrays[config.columns['date']] ?? [];
    const valueData = (data.columnArrays[config.columns['value']] ?? []) as number[];
    const pairs: [string, number][] = [];
    for (let i = 0; i < dateData.length; i++) {
      const value = valueData[i];
      if (!Number.isFinite(value)) continue;
      const iso = toIsoDate(dateData[i]);
      if (iso === null) continue;
      pairs.push([iso, value]);
    }
    return pairs;
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return this.pairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No dated values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = this.pairs(data, config);

    // pairs is non-empty here: the base renderer guards on isEmpty before buildOption.
    let minYear = Infinity;
    let maxYear = -Infinity;
    let min = Infinity;
    let max = -Infinity;
    for (const [iso, value] of pairs) {
      const year = Number(iso.slice(0, 4));
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    const range = minYear === maxYear ? String(minYear) : [String(minYear), String(maxYear)];

    return {
      tooltip: buildTooltip('item'),
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0,
        inRange: { color: [theme.sequentialScale[0], theme.sequentialScale[1]] },
        textStyle: { color: theme.axisColor },
      },
      calendar: {
        range,
        cellSize: ['auto', 'auto'],
        splitLine: { lineStyle: { color: theme.gridColor } },
        itemStyle: { borderColor: theme.gridColor, color: 'transparent' },
        dayLabel: { color: theme.axisColor },
        monthLabel: { color: theme.axisColor },
        yearLabel: { color: theme.foreground },
      },
      series: [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: pairs,
      }],
    };
  }
}

chartRegistry.register({
  type: 'calendar_heatmap',
  family: 'time-series',
  name: 'Calendar Heatmap',
  description: 'Daily values laid out on a calendar, colored by magnitude',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CalendarHeatmapRenderer(),
});

import { createElement } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ChartRenderer, ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/**
 * Base class for all ECharts-backed chart renderers.
 * Subclasses override buildOption() to produce the ECharts option object.
 */
export abstract class EChartsBaseRenderer implements ChartRenderer {
  abstract buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption;

  render(data: DataView, config: ChartConfig, theme: ThemeTokens) {
    const option = this.buildOption(data, config, theme);

    // Apply theme defaults
    option.backgroundColor = 'transparent';
    if (!option.textStyle) option.textStyle = {};
    (option.textStyle as Record<string, unknown>).color = theme.foreground;
    (option.textStyle as Record<string, unknown>).fontFamily = theme.fontFamily;

    return createElement(ReactECharts, {
      option,
      style: { width: '100%', height: '100%' },
      opts: { renderer: 'canvas' },
      notMerge: true,
    });
  }
}

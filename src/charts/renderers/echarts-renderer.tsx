import { createElement } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ChartRenderer, ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EmptyChartState } from './EmptyChartState';

declare global {
  interface Window {
    /** Set by the Playwright visual gate to force deterministic, animation-free renders. */
    __E2E__?: boolean;
  }
}

/**
 * Base class for all ECharts-backed chart renderers.
 * Subclasses override buildOption() to produce the ECharts option object.
 * The base handles the empty-data guard and theme application so every chart
 * inherits both instead of re-implementing them.
 */
export abstract class EChartsBaseRenderer implements ChartRenderer {
  abstract buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption;

  render(data: DataView, config: ChartConfig, theme: ThemeTokens) {
    if (this.isEmpty(data, config)) {
      return createElement(EmptyChartState, { message: this.emptyMessage() });
    }

    const option = this.buildOption(data, config, theme);

    // Apply theme defaults
    option.backgroundColor = 'transparent';
    if (!option.textStyle) option.textStyle = {};
    (option.textStyle as Record<string, unknown>).color = theme.foreground;
    (option.textStyle as Record<string, unknown>).fontFamily = theme.fontFamily;

    // The visual-regression gate disables ECharts' entry animation so screenshots
    // capture the deterministic final frame (Playwright's animations:'disabled'
    // only affects CSS/Web animations, not ECharts' canvas rAF loop).
    if (window.__E2E__) {
      option.animation = false;
    }

    return createElement(ReactECharts, {
      option,
      style: { width: '100%', height: '100%' },
      opts: { renderer: 'canvas' },
      notMerge: true,
    });
  }

  /** Whether the chart has nothing to render. Override for chart-specific emptiness. */
  protected isEmpty(data: DataView, _config: ChartConfig): boolean {
    return data.rowCount === 0;
  }

  /** Message shown by the empty-state guard. Override to be chart-specific. */
  protected emptyMessage(): string {
    return 'No data to display';
  }
}

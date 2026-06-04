import { createElement } from 'react';
import type { ChartConfig, ChartRenderer, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EmptyChartState } from './EmptyChartState';
import { ReglChart, type ReglDraw } from './ReglChart';

/**
 * Base class for regl-backed charts.
 * Subclasses implement draw(); this base owns React mounting, WebGL context
 * creation, responsive canvas sizing, empty-data handling, and cleanup.
 */
export abstract class ReglBaseRenderer implements ChartRenderer {
  destroy?(): void;

  abstract draw(...args: Parameters<ReglDraw>): void;

  render(data: DataView, config: ChartConfig, theme: ThemeTokens) {
    if (this.isEmpty(data, config)) {
      return createElement(EmptyChartState, { message: this.emptyMessage() });
    }

    return createElement(ReglChart, {
      data,
      config,
      theme,
      draw: this.draw.bind(this),
      onDestroy: this.destroy?.bind(this),
    });
  }

  /** Whether the chart has nothing to draw. Override for chart-specific emptiness. */
  protected isEmpty(data: DataView, _config: ChartConfig): boolean {
    return data.rowCount === 0;
  }

  /** Message shown by the empty-state guard. Override to be chart-specific. */
  protected emptyMessage(): string {
    return 'No data to display';
  }
}

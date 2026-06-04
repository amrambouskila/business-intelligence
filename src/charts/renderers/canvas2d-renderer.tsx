import { createElement } from 'react';
import type { ChartConfig, ChartRenderer, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EmptyChartState } from './EmptyChartState';
import { Canvas2DChart, type Canvas2DSize } from './Canvas2DChart';

/**
 * Base class for Canvas2D-backed charts.
 * Subclasses implement draw(); this base owns React mounting, canvas sizing,
 * device-pixel-ratio scaling, empty-data handling, and optional destroy().
 */
export abstract class Canvas2DBaseRenderer implements ChartRenderer {
  destroy?(): void;

  abstract draw(
    context: CanvasRenderingContext2D,
    size: Canvas2DSize,
    data: DataView,
    config: ChartConfig,
    theme: ThemeTokens,
  ): void;

  render(data: DataView, config: ChartConfig, theme: ThemeTokens) {
    if (this.isEmpty(data, config)) {
      return createElement(EmptyChartState, { message: this.emptyMessage() });
    }

    return createElement(Canvas2DChart, {
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

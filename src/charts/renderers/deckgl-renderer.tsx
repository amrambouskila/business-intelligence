import { createElement } from 'react';
import DeckGL from '@deck.gl/react';
import type { Layer } from '@deck.gl/core';
import type { ChartRenderer, ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/**
 * Base class for all deck.gl-backed chart renderers.
 * Subclasses override buildLayers() to produce deck.gl Layer instances.
 */
export abstract class DeckGLBaseRenderer implements ChartRenderer {
  abstract buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[];

  protected getInitialViewState(_data: DataView, _config: ChartConfig) {
    return {
      longitude: 0,
      latitude: 0,
      zoom: 1,
      pitch: 0,
      bearing: 0,
    };
  }

  render(data: DataView, config: ChartConfig, theme: ThemeTokens) {
    const layers = this.buildLayers(data, config, theme);
    const viewState = this.getInitialViewState(data, config);

    return createElement(DeckGL, {
      initialViewState: viewState,
      controller: true,
      layers,
      style: { width: '100%', height: '100%', background: 'transparent' },
    } as Record<string, unknown>);
  }
}

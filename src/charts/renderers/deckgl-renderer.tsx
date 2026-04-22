import type { Layer } from '@deck.gl/core';
import type { ChartRenderer, ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { DeckGLChart, type ViewState } from '@/charts/renderers/DeckGLChart';

export abstract class DeckGLBaseRenderer implements ChartRenderer {
  abstract buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[];

  protected getInitialViewState(_data: DataView, _config: ChartConfig): ViewState {
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
    return <DeckGLChart layers={layers} initialViewState={viewState} />;
  }
}

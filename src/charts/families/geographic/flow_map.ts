import { ArcLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoFlows, mapViewStateForFlows, numericExtent, paletteColor, scaledRadius, type GeoFlow } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'minWidth', label: 'Min width', control: 'number', default: 2, min: 1, max: 10, step: 1 },
  { key: 'maxWidth', label: 'Max width', control: 'number', default: 8, min: 1, max: 24, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.82, min: 0.1, max: 1, step: 0.05 },
];

class FlowMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const flows = finiteGeoFlows(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const minWidth = opts.minWidth as number;
    const maxWidth = Math.max(minWidth, opts.maxWidth as number);
    const opacity = opts.opacity as number;
    const extent = numericExtent(flows.map((flow) => flow.value));

    return [
      new ArcLayer<GeoFlow>({
        id: 'flow-map-layer',
        data: flows,
        getSourcePosition: (flow) => flow.origin,
        getTargetPosition: (flow) => flow.destination,
        getSourceColor: paletteColor(theme, 0, opacity),
        getTargetColor: paletteColor(theme, 1, opacity),
        getWidth: (flow) => scaledRadius(flow.value, extent, minWidth, maxWidth),
        widthUnits: 'pixels',
        widthMinPixels: minWidth,
        widthMaxPixels: maxWidth,
        greatCircle: true,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewStateForFlows(finiteGeoFlows(data, config));
  }
}

chartRegistry.register({
  type: 'flow_map',
  family: 'geographic',
  name: 'Flow Map',
  description: 'Origin-to-destination geographic flows as weighted arcs',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'origin_lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Origin latitude' },
    { role: 'origin_lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Origin longitude' },
    { role: 'dest_lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Destination latitude' },
    { role: 'dest_lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Destination longitude' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Flow value' },
  ],
  options: optionSpecs,
  createRenderer: () => new FlowMapRenderer(),
});

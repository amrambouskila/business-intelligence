import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import {
  finiteGeoPoints,
  hexToRgba,
  mapViewState,
  numericExtent,
  scaledRadius,
  type GeoPoint,
} from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'minRadius', label: 'Min radius', control: 'number', default: 5, min: 1, max: 40, step: 1 },
  { key: 'maxRadius', label: 'Max radius', control: 'number', default: 22, min: 2, max: 80, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.72, min: 0.1, max: 1, step: 0.05 },
];

class BubbleMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const minRadius = opts.minRadius as number;
    const maxRadius = Math.max(minRadius, opts.maxRadius as number);
    const opacity = opts.opacity as number;
    const extent = numericExtent(points.map((point) => point.value));
    const fillColor = hexToRgba(theme.colorScale[0] ?? theme.foreground, opacity, theme.foreground);
    const lineColor = hexToRgba(theme.background, 0.9, theme.foreground);

    return [
      new ScatterplotLayer<GeoPoint>({
        id: 'bubble-map-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getRadius: (point) => scaledRadius(point.value, extent, minRadius, maxRadius),
        radiusUnits: 'pixels',
        radiusMinPixels: minRadius,
        radiusMaxPixels: maxRadius,
        stroked: true,
        filled: true,
        getFillColor: fillColor,
        getLineColor: lineColor,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewState(finiteGeoPoints(data, config));
  }
}

chartRegistry.register({
  type: 'bubble_map',
  family: 'geographic',
  name: 'Bubble Map',
  description: 'Geographic points sized by a numeric value',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new BubbleMapRenderer(),
});

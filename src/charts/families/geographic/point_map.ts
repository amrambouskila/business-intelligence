import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, hexToRgba, mapViewState, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'radius', label: 'Radius', control: 'number', default: 7, min: 1, max: 40, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.75, min: 0.1, max: 1, step: 0.05 },
];

class PointMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const radius = opts.radius as number;
    const opacity = opts.opacity as number;
    const fillColor = hexToRgba(theme.colorScale[0] ?? theme.foreground, opacity, theme.foreground);
    const lineColor = hexToRgba(theme.background, 0.9, theme.foreground);

    return [
      new ScatterplotLayer<GeoPoint>({
        id: 'point-map-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getRadius: () => radius,
        radiusUnits: 'pixels',
        radiusMinPixels: radius,
        radiusMaxPixels: radius,
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
  type: 'point_map',
  family: 'geographic',
  name: 'Point Map',
  description: 'Geographic points plotted by latitude and longitude',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
  ],
  options: optionSpecs,
  createRenderer: () => new PointMapRenderer(),
});

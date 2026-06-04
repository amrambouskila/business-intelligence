import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, mapViewState, sequentialColorRange, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'radiusPixels', label: 'Radius pixels', control: 'number', default: 42, min: 8, max: 140, step: 2 },
  { key: 'intensity', label: 'Intensity', control: 'number', default: 1.2, min: 0.1, max: 5, step: 0.1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.8, min: 0.1, max: 1, step: 0.05 },
];

class GeospatialHeatmapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const radiusPixels = opts.radiusPixels as number;
    const intensity = opts.intensity as number;
    const opacity = opts.opacity as number;

    return [
      new HeatmapLayer<GeoPoint>({
        id: 'geospatial-heatmap-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getWeight: (point) => point.value ?? 1,
        radiusPixels,
        intensity,
        colorRange: sequentialColorRange(theme, opacity),
        aggregation: 'SUM',
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewState(finiteGeoPoints(data, config));
  }
}

chartRegistry.register({
  type: 'geospatial_heatmap',
  family: 'geographic',
  name: 'Geospatial Heatmap',
  description: 'Weighted heatmap over latitude and longitude points',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new GeospatialHeatmapRenderer(),
});

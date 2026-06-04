import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, mapViewState, sequentialColorRange, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'radiusMeters', label: 'Radius meters', control: 'number', default: 650000, min: 10000, max: 2000000, step: 10000 },
  { key: 'coverage', label: 'Coverage', control: 'number', default: 0.85, min: 0.1, max: 1, step: 0.05 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.82, min: 0.1, max: 1, step: 0.05 },
];

class HexbinMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const radius = opts.radiusMeters as number;
    const coverage = opts.coverage as number;
    const opacity = opts.opacity as number;

    return [
      new HexagonLayer<GeoPoint>({
        id: 'hexbin-map-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getColorWeight: (point) => point.value ?? 1,
        getElevationWeight: (point) => point.value ?? 1,
        radius,
        coverage,
        extruded: false,
        colorRange: sequentialColorRange(theme, opacity),
        colorAggregation: 'SUM',
        elevationAggregation: 'SUM',
        gpuAggregation: false,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewState(finiteGeoPoints(data, config));
  }
}

chartRegistry.register({
  type: 'hexbin_map',
  family: 'geographic',
  name: 'Hexbin Map',
  description: 'Hexagonal aggregation of geographic point clouds',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Weight' },
  ],
  options: optionSpecs,
  createRenderer: () => new HexbinMapRenderer(),
});

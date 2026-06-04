import { ScreenGridLayer } from '@deck.gl/aggregation-layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, mapViewState, sequentialColorRange, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'cellSize', label: 'Cell size', control: 'number', default: 48, min: 12, max: 120, step: 4 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.78, min: 0.1, max: 1, step: 0.05 },
];

class DensityMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const cellSize = opts.cellSize as number;
    const opacity = opts.opacity as number;

    return [
      new ScreenGridLayer<GeoPoint>({
        id: 'density-map-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getWeight: () => 1,
        cellSizePixels: cellSize,
        cellMarginPixels: 1,
        colorRange: sequentialColorRange(theme, opacity),
        colorScaleType: 'linear',
        aggregation: 'COUNT',
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
  type: 'density_map',
  family: 'geographic',
  name: 'Density Map',
  description: 'Viewport density grid for geographic point clouds',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
  ],
  options: optionSpecs,
  createRenderer: () => new DensityMapRenderer(),
});

import { ContourLayer } from '@deck.gl/aggregation-layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, mapViewState, paletteColor, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'cellSizeMeters', label: 'Cell size meters', control: 'number', default: 450000, min: 10000, max: 1500000, step: 10000 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.72, min: 0.1, max: 1, step: 0.05 },
];

class IsochroneContourMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const cellSize = opts.cellSizeMeters as number;
    const opacity = opts.opacity as number;

    return [
      new ContourLayer<GeoPoint>({
        id: 'isochrone-contour-map-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getWeight: (point) => point.value ?? 1,
        cellSize,
        contours: [
          { threshold: 60, color: paletteColor(theme, 0, opacity), strokeWidth: 2 },
          { threshold: 75, color: paletteColor(theme, 1, opacity), strokeWidth: 2 },
          { threshold: 90, color: paletteColor(theme, 2, opacity), strokeWidth: 2 },
        ],
        aggregation: 'MEAN',
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
  type: 'isochrone_contour_map',
  family: 'geographic',
  name: 'Isochrone / Contour Map',
  description: 'Geographic contour bands from weighted point observations',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'geo_polygons', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Time / value' },
  ],
  options: optionSpecs,
  createRenderer: () => new IsochroneContourMapRenderer(),
});

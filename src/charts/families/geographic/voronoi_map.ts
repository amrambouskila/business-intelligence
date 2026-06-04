import { PolygonLayer } from '@deck.gl/layers';
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
  paletteColor,
  rectangularGeoCells,
  scaledRadius,
  type GeoCell,
} from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.42, min: 0.1, max: 0.9, step: 0.05 },
  { key: 'lineWidth', label: 'Line width', control: 'number', default: 1, min: 0, max: 6, step: 1 },
];

function cellColor(cell: GeoCell, extent: [number, number], theme: ThemeTokens, opacity: number): [number, number, number, number] {
  const paletteIndex = Math.round(scaledRadius(cell.value, extent, 0, Math.max(0, theme.colorScale.length - 1)));
  return paletteColor(theme, paletteIndex, opacity);
}

class VoronoiMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const cells = rectangularGeoCells(points);
    const opts = resolveOptions(optionSpecs, config.options);
    const opacity = opts.opacity as number;
    const lineWidth = opts.lineWidth as number;
    const valueExtent = numericExtent(points.map((point) => point.value));
    const lineColor = hexToRgba(theme.foreground, 0.85, theme.foreground);

    return [
      new PolygonLayer<GeoCell>({
        id: 'voronoi-map-layer',
        data: cells,
        getPolygon: (cell) => cell.polygon,
        getFillColor: (cell) => cellColor(cell, valueExtent, theme, opacity),
        getLineColor: lineColor,
        getLineWidth: () => lineWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: lineWidth,
        stroked: true,
        filled: true,
        extruded: false,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewState(finiteGeoPoints(data, config));
  }
}

chartRegistry.register({
  type: 'voronoi_map',
  family: 'geographic',
  name: 'Voronoi Map',
  description: 'Local spatial partitions around geographic points',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new VoronoiMapRenderer(),
});

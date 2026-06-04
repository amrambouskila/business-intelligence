import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, hexToRgba, mapViewState, paletteColor, type GeoPoint } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'radius', label: 'Radius', control: 'number', default: 9, min: 1, max: 40, step: 1 },
  { key: 'labelSize', label: 'Label size', control: 'number', default: 12, min: 8, max: 28, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.8, min: 0.1, max: 1, step: 0.05 },
];

function categoryIndex(points: GeoPoint[]): Map<string, number> {
  const categories = new Map<string, number>();
  for (const point of points) {
    const category = point.category ?? '';
    if (!categories.has(category)) categories.set(category, categories.size);
  }
  return categories;
}

class SymbolMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const categories = categoryIndex(points);
    const opts = resolveOptions(optionSpecs, config.options);
    const radius = opts.radius as number;
    const labelSize = opts.labelSize as number;
    const opacity = opts.opacity as number;
    const lineColor = hexToRgba(theme.background, 0.9, theme.foreground);
    const textColor = hexToRgba(theme.foreground, 0.95, theme.foreground);

    return [
      new ScatterplotLayer<GeoPoint>({
        id: 'symbol-map-points-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getRadius: () => radius,
        radiusUnits: 'pixels',
        radiusMinPixels: radius,
        radiusMaxPixels: radius,
        stroked: true,
        filled: true,
        getFillColor: (point) => paletteColor(theme, categories.get(point.category ?? '') ?? 0, opacity),
        getLineColor: lineColor,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        pickable: false,
      }),
      new TextLayer<GeoPoint>({
        id: 'symbol-map-labels-layer',
        data: points,
        getPosition: (point) => [point.longitude, point.latitude],
        getText: (point) => (point.category ?? '').slice(0, 1).toUpperCase(),
        getSize: () => labelSize,
        getColor: textColor,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: theme.fontFamily,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewState(finiteGeoPoints(data, config));
  }
}

chartRegistry.register({
  type: 'symbol_map',
  family: 'geographic',
  name: 'Symbol Map',
  description: 'Geographic points colored and labeled by category',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
  ],
  options: optionSpecs,
  createRenderer: () => new SymbolMapRenderer(),
});

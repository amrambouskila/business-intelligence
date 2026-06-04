import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoPoints, hexToRgba, mapViewState, paletteColor, type GeoPoint } from './geo-utils';

type GeoRoute = {
  path: Array<[number, number]>;
};

const optionSpecs: ChartOptionSpec[] = [
  { key: 'lineWidth', label: 'Line width', control: 'number', default: 4, min: 1, max: 16, step: 1 },
  { key: 'pointRadius', label: 'Point radius', control: 'number', default: 5, min: 1, max: 24, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.85, min: 0.1, max: 1, step: 0.05 },
];

function orderedPoints(points: GeoPoint[]): GeoPoint[] {
  return [...points].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function routePath(points: GeoPoint[]): GeoRoute[] {
  const path = orderedPoints(points).map((point) => [point.longitude, point.latitude] as [number, number]);
  return path.length > 1 ? [{ path }] : [];
}

class RouteMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const points = finiteGeoPoints(data, config);
    const ordered = orderedPoints(points);
    const opts = resolveOptions(optionSpecs, config.options);
    const lineWidth = opts.lineWidth as number;
    const pointRadius = opts.pointRadius as number;
    const opacity = opts.opacity as number;
    const pathColor = paletteColor(theme, 0, opacity);
    const pointColor = paletteColor(theme, 1, opacity);
    const lineColor = hexToRgba(theme.background, 0.9, theme.foreground);

    return [
      new PathLayer<GeoRoute>({
        id: 'route-map-path-layer',
        data: routePath(points),
        getPath: (route) => route.path,
        getColor: pathColor,
        getWidth: () => lineWidth,
        widthUnits: 'pixels',
        widthMinPixels: lineWidth,
        widthMaxPixels: lineWidth,
        rounded: true,
        pickable: false,
      }),
      new ScatterplotLayer<GeoPoint>({
        id: 'route-map-points-layer',
        data: ordered,
        getPosition: (point) => [point.longitude, point.latitude],
        getRadius: () => pointRadius,
        radiusUnits: 'pixels',
        radiusMinPixels: pointRadius,
        radiusMaxPixels: pointRadius,
        stroked: true,
        filled: true,
        getFillColor: pointColor,
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
  type: 'route_map',
  family: 'geographic',
  name: 'Route Map',
  description: 'Sequential geographic route through ordered latitude/longitude points',
  renderer: 'deckgl',
  compatibleShapes: ['geo_points', 'generic'],
  requiredColumns: [
    { role: 'lat', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Latitude' },
    { role: 'lon', acceptedTypes: ['geo_point', 'numeric', 'integer', 'float'], label: 'Longitude' },
    { role: 'order', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Order' },
  ],
  options: optionSpecs,
  createRenderer: () => new RouteMapRenderer(),
});

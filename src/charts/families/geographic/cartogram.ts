import { PolygonLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import {
  finiteGeoRegions,
  hexToRgba,
  mapViewStateForRegions,
  numericExtent,
  scaledPolygon,
  scaledRadius,
  valueColor,
  type GeoRegion,
} from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'minScale', label: 'Min scale', control: 'number', default: 0.55, min: 0.1, max: 1, step: 0.05 },
  { key: 'maxScale', label: 'Max scale', control: 'number', default: 1.15, min: 0.5, max: 2, step: 0.05 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.68, min: 0.1, max: 1, step: 0.05 },
];

class CartogramRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const regions = finiteGeoRegions(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const minScale = opts.minScale as number;
    const maxScale = Math.max(minScale, opts.maxScale as number);
    const opacity = opts.opacity as number;
    const extent = numericExtent(regions.map((region) => region.value));

    return [
      new PolygonLayer<GeoRegion>({
        id: 'cartogram-layer',
        data: regions,
        getPolygon: (region) => scaledPolygon(region, scaledRadius(region.value, extent, minScale, maxScale)),
        getFillColor: (region) => valueColor(region.value, extent, theme, opacity),
        getLineColor: hexToRgba(theme.foreground, 0.85, theme.foreground),
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        extruded: false,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewStateForRegions(finiteGeoRegions(data, config));
  }
}

chartRegistry.register({
  type: 'cartogram',
  family: 'geographic',
  name: 'Cartogram',
  description: 'Value-scaled region polygons for geographic comparison',
  renderer: 'deckgl',
  compatibleShapes: ['geo_polygons', 'generic'],
  requiredColumns: [
    { role: 'region', acceptedTypes: ['category', 'text'], label: 'Region' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new CartogramRenderer(),
});

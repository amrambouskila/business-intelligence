import { PolygonLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoRegions, hexToRgba, mapViewStateForRegions, numericExtent, tileGridRegions, valueColor, type GeoRegion } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.76, min: 0.1, max: 1, step: 0.05 },
  { key: 'gapWidth', label: 'Gap width', control: 'number', default: 2, min: 0, max: 8, step: 1 },
];

class TileGridMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const regions = tileGridRegions(finiteGeoRegions(data, config));
    const opts = resolveOptions(optionSpecs, config.options);
    const opacity = opts.opacity as number;
    const gapWidth = opts.gapWidth as number;
    const extent = numericExtent(regions.map((region) => region.value));

    return [
      new PolygonLayer<GeoRegion>({
        id: 'tile-grid-map-layer',
        data: regions,
        getPolygon: (region) => region.polygon,
        getFillColor: (region) => valueColor(region.value, extent, theme, opacity),
        getLineColor: hexToRgba(theme.background, 0.95, theme.foreground),
        getLineWidth: () => gapWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: gapWidth,
        stroked: true,
        filled: true,
        extruded: false,
        pickable: false,
      }),
    ];
  }

  protected getInitialViewState(data: DataView, config: ChartConfig): MapViewState {
    return mapViewStateForRegions(tileGridRegions(finiteGeoRegions(data, config)));
  }
}

chartRegistry.register({
  type: 'tile_grid_map',
  family: 'geographic',
  name: 'Tile Grid / Grid Map',
  description: 'Region values arranged in a compact geographic tile grid',
  renderer: 'deckgl',
  compatibleShapes: ['geo_polygons', 'generic'],
  requiredColumns: [
    { role: 'region', acceptedTypes: ['category', 'text'], label: 'Region' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new TileGridMapRenderer(),
});

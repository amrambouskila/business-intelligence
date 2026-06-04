import { PolygonLayer } from '@deck.gl/layers';
import type { Layer, MapViewState } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finiteGeoRegions, hexToRgba, mapViewStateForRegions, numericExtent, valueColor, type GeoRegion } from './geo-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.72, min: 0.1, max: 1, step: 0.05 },
  { key: 'lineWidth', label: 'Line width', control: 'number', default: 1, min: 0, max: 6, step: 1 },
];

class ChoroplethMapRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const regions = finiteGeoRegions(data, config);
    const opts = resolveOptions(optionSpecs, config.options);
    const opacity = opts.opacity as number;
    const lineWidth = opts.lineWidth as number;
    const extent = numericExtent(regions.map((region) => region.value));

    return [
      new PolygonLayer<GeoRegion>({
        id: 'choropleth-map-layer',
        data: regions,
        getPolygon: (region) => region.polygon,
        getFillColor: (region) => valueColor(region.value, extent, theme, opacity),
        getLineColor: hexToRgba(theme.foreground, 0.85, theme.foreground),
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
    return mapViewStateForRegions(finiteGeoRegions(data, config));
  }
}

chartRegistry.register({
  type: 'choropleth_map',
  family: 'geographic',
  name: 'Choropleth Map',
  description: 'Region polygons colored by an aggregated numeric value',
  renderer: 'deckgl',
  compatibleShapes: ['geo_polygons', 'generic'],
  requiredColumns: [
    { role: 'region', acceptedTypes: ['category', 'text'], label: 'Region' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new ChoroplethMapRenderer(),
});

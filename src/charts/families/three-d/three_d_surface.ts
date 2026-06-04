import { PolygonLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finite3DPoints, numericExtent, orbitViewState, surfaceCells, valueColor, type SurfaceCell } from './three-d-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.72, min: 0.1, max: 1, step: 0.05 },
];

class ThreeDSurfaceRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const opts = resolveOptions(optionSpecs, config.options);
    const cells = surfaceCells(finite3DPoints(data, config));
    const extent = numericExtent(cells.map((cell) => cell.value));
    return [
      new PolygonLayer<SurfaceCell>({
        id: 'three-d-surface-layer',
        data: cells,
        getPolygon: (cell) => cell.polygon,
        getFillColor: (cell) => valueColor(cell.value, extent, theme, opts.opacity as number),
        getLineColor: valueColor(undefined, extent, theme, 0.8),
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        stroked: true,
        filled: true,
        extruded: false,
        pickable: false,
      }),
    ];
  }

  protected getViewKind() {
    return 'orbit' as const;
  }

  protected getInitialViewState() {
    return orbitViewState();
  }
}

chartRegistry.register({
  type: 'three_d_surface',
  family: '3d',
  name: '3D Surface',
  description: 'Binned 3D surface mesh from x/y/z numeric observations',
  renderer: 'deckgl',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z' },
  ],
  options: optionSpecs,
  createRenderer: () => new ThreeDSurfaceRenderer(),
});

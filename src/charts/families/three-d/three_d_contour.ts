import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { contourPaths, finite3DPoints, numericExtent, orbitViewState, surfaceCells, valueColor, type Path3D } from './three-d-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'lineWidth', label: 'Line width', control: 'number', default: 3, min: 1, max: 10, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.84, min: 0.1, max: 1, step: 0.05 },
];

class ThreeDContourRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const opts = resolveOptions(optionSpecs, config.options);
    const cells = surfaceCells(finite3DPoints(data, config));
    const extent = numericExtent(cells.map((cell) => cell.value));
    const thresholds = [extent[0], (extent[0] + extent[1]) / 2, extent[1]];
    const paths = contourPaths(cells, thresholds);
    const width = opts.lineWidth as number;
    return [
      new PathLayer<Path3D>({
        id: 'three-d-contour-layer',
        data: paths,
        getPath: (path) => path.path,
        getColor: (path) => valueColor(path.value, extent, theme, opts.opacity as number),
        getWidth: () => width,
        widthUnits: 'pixels',
        widthMinPixels: width,
        _pathType: 'open',
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
  type: 'three_d_contour',
  family: '3d',
  name: '3D Contour',
  description: 'Elevated contour paths from binned x/y/z observations',
  renderer: 'deckgl',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z' },
  ],
  options: optionSpecs,
  createRenderer: () => new ThreeDContourRenderer(),
});

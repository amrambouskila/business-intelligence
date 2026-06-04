import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finite3DPoints, numericExtent, orbitViewState, surfaceCells, valueColor, wireframePaths, type Path3D } from './three-d-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'lineWidth', label: 'Line width', control: 'number', default: 2, min: 1, max: 8, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.86, min: 0.1, max: 1, step: 0.05 },
];

class ThreeDWireframeRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const opts = resolveOptions(optionSpecs, config.options);
    const paths = wireframePaths(surfaceCells(finite3DPoints(data, config)));
    const extent = numericExtent(paths.map((path) => path.value));
    const width = opts.lineWidth as number;
    return [
      new PathLayer<Path3D>({
        id: 'three-d-wireframe-layer',
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
  type: 'three_d_wireframe',
  family: '3d',
  name: '3D Wireframe',
  description: 'Wireframe mesh over binned x/y/z observations',
  renderer: 'deckgl',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z' },
  ],
  options: optionSpecs,
  createRenderer: () => new ThreeDWireframeRenderer(),
});

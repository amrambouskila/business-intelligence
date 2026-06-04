import { PointCloudLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finite3DPoints, normalizedPoints, orbitViewState, paletteColor, type Point3D } from './three-d-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'pointSize', label: 'Point size', control: 'number', default: 3, min: 1, max: 16, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.82, min: 0.1, max: 1, step: 0.05 },
];

class ThreeDScatterRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const opts = resolveOptions(optionSpecs, config.options);
    const points = normalizedPoints(finite3DPoints(data, config));
    return [
      new PointCloudLayer<Point3D>({
        id: 'three-d-scatter-layer',
        data: points,
        getPosition: (point) => [point.x, point.y, point.z],
        getColor: paletteColor(theme, 0, opts.opacity as number),
        getNormal: [0, 0, 1],
        pointSize: opts.pointSize as number,
        sizeUnits: 'pixels',
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
  type: 'three_d_scatter',
  family: '3d',
  name: '3D Scatter',
  description: 'Three-dimensional point cloud from x, y, and z numeric columns',
  renderer: 'deckgl',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z' },
  ],
  options: optionSpecs,
  createRenderer: () => new ThreeDScatterRenderer(),
});

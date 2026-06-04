import { ColumnLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { finite3DPoints, normalizedPoints, numericExtent, orbitViewState, scaleValue, valueColor, type Point3D } from './three-d-utils';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'radius', label: 'Radius', control: 'number', default: 4, min: 1, max: 16, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.78, min: 0.1, max: 1, step: 0.05 },
];

class ThreeDBarChartRenderer extends DeckGLBaseRenderer {
  buildLayers(data: DataView, config: ChartConfig, theme: ThemeTokens): Layer[] {
    const opts = resolveOptions(optionSpecs, config.options);
    const points = normalizedPoints(finite3DPoints(data, config)).slice(0, 120);
    const zExtent = numericExtent(points.map((point) => point.z));
    return [
      new ColumnLayer<Point3D>({
        id: 'three-d-bar-chart-layer',
        data: points,
        getPosition: (point) => [point.x, point.y, 0],
        getElevation: (point) => scaleValue(point.z, zExtent, 4, 80),
        getFillColor: (point) => valueColor(point.z, zExtent, theme, opts.opacity as number),
        getLineColor: valueColor(undefined, zExtent, theme, 0.9),
        radius: opts.radius as number,
        radiusUnits: 'common',
        diskResolution: 6,
        extruded: true,
        stroked: false,
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
  type: 'three_d_bar_chart',
  family: '3d',
  name: '3D Bar Chart',
  description: 'Extruded 3D columns positioned by x/y and elevated by z',
  renderer: 'deckgl',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z' },
  ],
  options: optionSpecs,
  createRenderer: () => new ThreeDBarChartRenderer(),
});

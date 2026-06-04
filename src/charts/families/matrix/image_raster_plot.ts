import { chartRegistry } from '@/charts/registry';
import { buildMatrixGrid, type MatrixGrid } from '@/charts/echarts/matrixGrid';
import { ReglBaseRenderer } from '@/charts/renderers/regl-renderer';
import type { ReglDraw, ReglSize } from '@/charts/renderers/ReglChart';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type RasterDrawProps = {
  positions: number[];
  colors: number[];
  count: number;
};

const FRAGMENT_SHADER = `
precision mediump float;
varying vec4 vColor;
void main() {
  gl_FragColor = vColor;
}`;

const VERTEX_SHADER = `
precision mediump float;
attribute vec2 position;
attribute vec4 color;
varying vec4 vColor;
void main() {
  vColor = color;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

function matrixGrid(data: DataView, config: ChartConfig): MatrixGrid {
  return buildMatrixGrid(
    data.columnArrays[config.columns['row']] ?? [],
    data.columnArrays[config.columns['col']] ?? [],
    data.columnArrays[config.columns['intensity']] ?? [],
  );
}

function hexRgb(color: string, fallback: string): [number, number, number] {
  const source = /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  if (!/^#[0-9a-f]{6}$/i.test(source)) return [1, 1, 1];
  return [
    Number.parseInt(source.slice(1, 3), 16) / 255,
    Number.parseInt(source.slice(3, 5), 16) / 255,
    Number.parseInt(source.slice(5, 7), 16) / 255,
  ];
}

function valueColor(value: number, grid: MatrixGrid, theme: ThemeTokens): [number, number, number, number] {
  const [low, high] = theme.sequentialScale;
  const start = hexRgb(low, theme.foreground);
  const end = hexRgb(high, theme.foreground);
  const span = grid.max - grid.min;
  const t = span > 0 ? Math.max(0, Math.min(1, (value - grid.min) / span)) : 0.5;
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t,
    1,
  ];
}

function rasterBuffers(grid: MatrixGrid, theme: ThemeTokens): RasterDrawProps {
  const rows = Math.max(1, grid.rowCategories.length);
  const cols = Math.max(1, grid.colCategories.length);
  const positions: number[] = [];
  const colors: number[] = [];

  for (const [col, row, value] of grid.cells) {
    if (!Number.isFinite(value)) continue;

    const x0 = -1 + (2 * col) / cols;
    const x1 = -1 + (2 * (col + 1)) / cols;
    const y0 = 1 - (2 * row) / rows;
    const y1 = 1 - (2 * (row + 1)) / rows;
    const color = valueColor(value, grid, theme);
    const vertices = [
      [x0, y0], [x1, y0], [x0, y1],
      [x0, y1], [x1, y0], [x1, y1],
    ];

    for (const [x, y] of vertices) {
      positions.push(x, y);
      colors.push(...color);
    }
  }

  return { positions, colors, count: positions.length / 2 };
}

class ImageRasterPlotRenderer extends ReglBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return matrixGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No raster intensities to chart';
  }

  draw(
    regl: Parameters<ReglDraw>[0],
    _size: ReglSize,
    data: DataView,
    config: ChartConfig,
    theme: ThemeTokens,
  ): void {
    const grid = matrixGrid(data, config);
    const props = rasterBuffers(grid, theme);

    regl.clear({ color: [0, 0, 0, 0], depth: 1 });

    const drawCells = regl({
      frag: FRAGMENT_SHADER,
      vert: VERTEX_SHADER,
      attributes: {
        position: regl.prop<RasterDrawProps, 'positions'>('positions'),
        color: regl.prop<RasterDrawProps, 'colors'>('colors'),
      },
      count: regl.prop<RasterDrawProps, 'count'>('count'),
      primitive: 'triangles',
    }) as (props: RasterDrawProps) => void;

    drawCells(props);
  }
}

chartRegistry.register({
  type: 'image_raster_plot',
  family: 'matrix',
  name: 'Image / Raster Plot',
  description: 'Row and column pixel coordinates encoded by intensity',
  renderer: 'regl',
  compatibleShapes: ['matrix', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'intensity', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Intensity' },
  ],
  createRenderer: () => new ImageRasterPlotRenderer(),
});

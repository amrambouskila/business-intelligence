import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import type { DeckGLRef } from '@deck.gl/react';
import { OrbitView } from '@deck.gl/core';
import type { OrbitViewState } from '@deck.gl/core';

const deckProps = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock('@deck.gl/react', () => {
  const MockDeckGL = forwardRef<DeckGLRef, Record<string, unknown>>((props, ref) => {
    deckProps.push(props);
    useImperativeHandle(
      ref,
      () => ({
        deck: { finalize: vi.fn() } as unknown as DeckGLRef['deck'],
        pickObject: vi.fn(),
        pickObjects: vi.fn(),
        pickMultipleObjects: vi.fn(),
        pickObjectAsync: vi.fn(),
        pickObjectsAsync: vi.fn(),
      }),
      [],
    );
    return <div data-testid="mock-deckgl" />;
  });
  MockDeckGL.displayName = 'MockDeckGL';
  return { default: MockDeckGL };
});

import '@/charts/families/three-d/three_d_scatter';
import '@/charts/families/three-d/three_d_bar_chart';
import '@/charts/families/three-d/three_d_surface';
import '@/charts/families/three-d/three_d_wireframe';
import '@/charts/families/three-d/three_d_contour';
import '@/charts/families/three-d/three_d_volume_rendering';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import {
  contourPaths,
  finite3DPoints,
  hexToRgba,
  normalizedPoints,
  numericExtent,
  orbitViewState,
  paletteColor,
  scaleValue,
  surfaceCells,
  valueColor,
  wireframePaths,
} from '@/charts/families/three-d/three-d-utils';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Point3D = { x: number; y: number; z: number; value?: number };
type SurfaceCell = { polygon: Array<[number, number, number]>; value: number };
type Path3D = { path: Array<[number, number, number]>; value: number };

type PointCloudProps = {
  data: Point3D[];
  getPosition: (point: Point3D) => [number, number, number];
  getColor: [number, number, number, number] | ((point: Point3D) => [number, number, number, number]);
  getNormal: [number, number, number];
  pointSize: number;
  sizeUnits: string;
};

type ColumnProps = {
  data: Point3D[];
  getPosition: (point: Point3D) => [number, number, number];
  getElevation: (point: Point3D) => number;
  getFillColor: (point: Point3D) => [number, number, number, number];
  radius: number;
  radiusUnits: string;
  diskResolution: number;
  extruded: boolean;
};

type PolygonProps = {
  data: SurfaceCell[];
  getPolygon: (cell: SurfaceCell) => Array<[number, number, number]>;
  getFillColor: (cell: SurfaceCell) => [number, number, number, number];
  getLineColor: [number, number, number, number];
  getLineWidth: number;
  stroked: boolean;
  filled: boolean;
};

type PathProps = {
  data: Path3D[];
  getPath: (path: Path3D) => Array<[number, number, number]>;
  getColor: (path: Path3D) => [number, number, number, number];
  getWidth: () => number;
  widthMinPixels: number;
  _pathType: string;
};

function theme(): ThemeTokens {
  return {
    mode: 'dark',
    background: '#001122',
    foreground: '#ddeeff',
    gridColor: '#333',
    axisColor: '#666',
    colorScale: ['#336699', '#cc5500', '#669933'],
    sequentialScale: ['#000', '#fff'],
    divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial',
    fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(): DataView {
  return {
    sourceId: '3d',
    rows: [],
    filters: [],
    rowCount: 5,
    columns: [
      { name: 'x', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'y', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'z', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'value', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
    ],
    columnArrays: {
      x: [10, 20, 30, 'bad', 50],
      y: [5, 15, 25, 35, 45],
      z: [2, 4, 8, 16, 32],
      value: [100, 200, 400, 800, 'bad'],
    },
  };
}

function config(chartType: string, options: ChartConfig['options'] = {}): ChartConfig {
  return { chartType, columns: { x: 'x', y: 'y', z: 'z', value: 'value' }, options };
}

function renderer(chartType: string): DeckGLBaseRenderer {
  return chartRegistry.get(chartType)!.createRenderer() as DeckGLBaseRenderer;
}

describe('3D chart registrations', () => {
  it('registers all six 3D charts as deck.gl charts', () => {
    for (const type of ['three_d_scatter', 'three_d_surface', 'three_d_wireframe', 'three_d_contour', 'three_d_bar_chart', 'three_d_volume_rendering']) {
      const def = chartRegistry.get(type);
      expect(def).toBeDefined();
      expect(def!.family).toBe('3d');
      expect(def!.renderer).toBe('deckgl');
      expect(def!.requiredColumns.map((col) => col.role)).toContain('z');
    }
    expect(chartRegistry.get('three_d_volume_rendering')!.requiredColumns.map((col) => col.role)).toEqual(['x', 'y', 'z', 'value']);
  });
});

describe('3D renderers', () => {
  it('builds a point-cloud scatter layer and uses OrbitView', () => {
    const [layer] = renderer('three_d_scatter').buildLayers(dataView(), config('three_d_scatter', { pointSize: 7, opacity: 0.5 }), theme());
    const props = layer.props as unknown as PointCloudProps;
    expect(props.data).toHaveLength(4);
    expect(props.getPosition(props.data[0])).toEqual([-60, -60, -35]);
    expect(props.getColor).toEqual([51, 102, 153, 128]);
    expect(props.getNormal).toEqual([0, 0, 1]);
    expect(props.pointSize).toBe(7);
    expect(props.sizeUnits).toBe('pixels');

    deckProps.length = 0;
    render(<>{renderer('three_d_scatter').render(dataView(), config('three_d_scatter'), theme())}</>);
    expect(deckProps.at(-1)!.views).toBeInstanceOf(OrbitView);
    expect(deckProps.at(-1)!.initialViewState as OrbitViewState).toEqual(orbitViewState());
  });

  it('builds extruded 3D bar columns', () => {
    const [layer] = renderer('three_d_bar_chart').buildLayers(dataView(), config('three_d_bar_chart', { radius: 6, opacity: 0.5 }), theme());
    const props = layer.props as unknown as ColumnProps;
    expect(props.data).toHaveLength(4);
    expect(props.getPosition(props.data[0])).toEqual([-60, -60, 0]);
    expect(props.getElevation(props.data[0])).toBe(4);
    expect(props.getElevation(props.data.at(-1)!)).toBe(80);
    expect(props.getFillColor(props.data[0])).toEqual([51, 102, 153, 128]);
    expect(props.radius).toBe(6);
    expect(props.radiusUnits).toBe('common');
    expect(props.diskResolution).toBe(6);
    expect(props.extruded).toBe(true);
  });

  it('builds a 3D surface polygon mesh', () => {
    const [layer] = renderer('three_d_surface').buildLayers(dataView(), config('three_d_surface', { opacity: 0.5 }), theme());
    const props = layer.props as unknown as PolygonProps;
    expect(props.data.length).toBeGreaterThan(0);
    expect(props.getPolygon(props.data[0])).toEqual(props.data[0].polygon);
    expect(props.getFillColor(props.data[0])).toHaveLength(4);
    expect(props.getLineColor).toEqual([51, 102, 153, 204]);
    expect(props.getLineWidth).toBe(1);
    expect(props.stroked).toBe(true);
    expect(props.filled).toBe(true);
  });

  it('builds wireframe paths from the surface mesh', () => {
    const [layer] = renderer('three_d_wireframe').buildLayers(dataView(), config('three_d_wireframe', { lineWidth: 4, opacity: 0.5 }), theme());
    const props = layer.props as unknown as PathProps;
    expect(props.data.length).toBeGreaterThan(0);
    expect(props.getPath(props.data[0])).toEqual(props.data[0].path);
    expect(props.getColor(props.data[0])).toHaveLength(4);
    expect(props.getWidth()).toBe(4);
    expect(props.widthMinPixels).toBe(4);
    expect(props._pathType).toBe('open');
  });

  it('builds elevated contour paths', () => {
    const [layer] = renderer('three_d_contour').buildLayers(dataView(), config('three_d_contour', { lineWidth: 5, opacity: 0.5 }), theme());
    const props = layer.props as unknown as PathProps;
    expect(props.data.length).toBeGreaterThan(0);
    expect(props.getPath(props.data[0])).toEqual(props.data[0].path);
    expect(props.getColor(props.data[0])).toHaveLength(4);
    expect(props.getWidth()).toBe(5);
    expect(props.widthMinPixels).toBe(5);
  });

  it('builds a value-colored point volume', () => {
    const [layer] = renderer('three_d_volume_rendering').buildLayers(dataView(), config('three_d_volume_rendering', { pointSize: 8, opacity: 0.4 }), theme());
    const props = layer.props as unknown as PointCloudProps;
    const color = props.getColor as (point: Point3D) => [number, number, number, number];
    expect(props.data).toHaveLength(4);
    expect(props.getPosition(props.data[0])).toEqual([-60, -60, -35]);
    expect(color(props.data[0])).toEqual([51, 102, 153, 102]);
    expect(color(props.data[2])).toEqual([102, 153, 51, 102]);
    expect(color({ x: 0, y: 0, z: 400 })).toEqual([102, 153, 51, 102]);
    expect(props.getNormal).toEqual([0, 0, 1]);
    expect(props.pointSize).toBe(8);
    expect(props.sizeUnits).toBe('pixels');
  });

  it('renders every 3D chart through OrbitView', () => {
    deckProps.length = 0;
    render(<>
      {renderer('three_d_bar_chart').render(dataView(), config('three_d_bar_chart'), theme())}
      {renderer('three_d_surface').render(dataView(), config('three_d_surface'), theme())}
      {renderer('three_d_wireframe').render(dataView(), config('three_d_wireframe'), theme())}
      {renderer('three_d_contour').render(dataView(), config('three_d_contour'), theme())}
      {renderer('three_d_volume_rendering').render(dataView(), config('three_d_volume_rendering'), theme())}
    </>);
    for (const props of deckProps) {
      expect(props.views).toBeInstanceOf(OrbitView);
      expect(props.initialViewState as OrbitViewState).toEqual(orbitViewState());
    }
  });
});

describe('3D utilities', () => {
  it('covers normalization, color, and grid helper branches', () => {
    const points = finite3DPoints(dataView(), config('three_d_scatter'));
    expect(points).toHaveLength(4);
    expect(finite3DPoints({ ...dataView(), columnArrays: {} }, config('x'))).toEqual([]);
    expect(normalizedPoints([])).toEqual([]);
    expect(surfaceCells([])).toEqual([]);
    expect(wireframePaths([])).toEqual([]);
    expect(contourPaths([], [1, 2])).toEqual([]);
    expect(numericExtent([undefined, Number.NaN])).toEqual([0, 0]);
    expect(scaleValue(undefined, [1, 9], 2, 10)).toBe(2);
    expect(scaleValue(5, [5, 5], 2, 10)).toBe(6);
    expect(hexToRgba('#369', 2, '#def')).toEqual([51, 102, 153, 255]);
    expect(hexToRgba('nope', -1, '#def')).toEqual([221, 238, 255, 0]);
    expect(paletteColor({ ...theme(), colorScale: [] }, 2, 0.5)).toEqual([221, 238, 255, 128]);
    expect(valueColor(undefined, [1, 9], theme(), 0.5)).toEqual([51, 102, 153, 128]);
  });
});

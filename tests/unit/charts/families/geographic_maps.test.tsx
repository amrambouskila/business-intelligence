import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import type { DeckGLRef } from '@deck.gl/react';
import type { MapViewState } from '@deck.gl/core';

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

import '@/charts/families/geographic/bubble_map';
import '@/charts/families/geographic/symbol_map';
import '@/charts/families/geographic/density_map';
import '@/charts/families/geographic/hexbin_map';
import '@/charts/families/geographic/geospatial_heatmap';
import '@/charts/families/geographic/route_map';
import '@/charts/families/geographic/voronoi_map';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import {
  finiteGeoPoints,
  hexToRgba,
  numericExtent,
  paletteColor,
  rectangularGeoCells,
  scaledRadius,
  sequentialColorRange,
} from '@/charts/families/geographic/geo-utils';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ScatterProps = {
  data: Array<{ latitude: number; longitude: number; value?: number; category?: string; order?: number; label?: string }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getRadius: (point: { value?: number }) => number;
  getFillColor: [number, number, number, number] | ((point: { category?: string }) => [number, number, number, number]);
  getLineColor: [number, number, number, number];
  radiusMinPixels: number;
  radiusMaxPixels: number;
};

type TextProps = {
  data: Array<{ latitude: number; longitude: number; category?: string }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getText: (point: { category?: string }) => string;
  getSize: () => number;
  getColor: [number, number, number, number];
  fontFamily: string;
};

type PathProps = {
  data: Array<{ path: Array<[number, number]> }>;
  getPath: (route: { path: Array<[number, number]> }) => Array<[number, number]>;
  getColor: [number, number, number, number];
  getWidth: () => number;
  widthMinPixels: number;
  widthMaxPixels: number;
};

type DensityProps = {
  data: Array<{ latitude: number; longitude: number; value?: number }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getWeight: (point: { value?: number }) => number;
  cellSizePixels: number;
  cellMarginPixels: number;
  colorRange: Array<[number, number, number, number]>;
  colorScaleType: string;
  aggregation: string;
  gpuAggregation: boolean;
};

type HexbinProps = {
  data: Array<{ latitude: number; longitude: number; value?: number }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getColorWeight: (point: { value?: number }) => number;
  getElevationWeight: (point: { value?: number }) => number;
  radius: number;
  coverage: number;
  extruded: boolean;
  colorRange: Array<[number, number, number, number]>;
  colorAggregation: string;
  elevationAggregation: string;
  gpuAggregation: boolean;
};

type HeatmapProps = {
  data: Array<{ latitude: number; longitude: number; value?: number }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getWeight: (point: { value?: number }) => number;
  radiusPixels: number;
  intensity: number;
  colorRange: Array<[number, number, number, number]>;
  aggregation: string;
};

type PolygonProps = {
  data: Array<{ latitude: number; longitude: number; value?: number; polygon: Array<[number, number]> }>;
  getPolygon: (cell: { polygon: Array<[number, number]> }) => Array<[number, number]>;
  getFillColor: (cell: { value?: number }) => [number, number, number, number];
  getLineColor: [number, number, number, number];
  getLineWidth: () => number;
  lineWidthMinPixels: number;
  stroked: boolean;
  filled: boolean;
  extruded: boolean;
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
    sourceId: 'geo',
    rows: [],
    filters: [],
    rowCount: 5,
    columns: [
      { name: 'latitude', type: 'geo_point', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'longitude', type: 'geo_point', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'category', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'order', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'city', type: 'category', nullable: false, uniqueCount: 5, nullCount: 0 },
    ],
    columnArrays: {
      latitude: [47.6062, 37.7749, 'bad', 91, 40.7128],
      longitude: [-122.3321, -122.4194, -75, -100, -74.006],
      value: [82, 95, 70, 61, 91],
      category: ['West', 'West', 'South', 'Invalid', 'East'],
      order: [2, 1, 3, 4, 5],
      city: ['Seattle', 'San Francisco', 'Bad', 'Out of bounds', 'New York'],
    },
  };
}

function config(chartType: string, options: ChartConfig['options'] = {}): ChartConfig {
  return {
    chartType,
    columns: {
      lat: 'latitude',
      lon: 'longitude',
      value: 'value',
      category: 'category',
      order: 'order',
      label: 'city',
    },
    options,
  };
}

function renderer(chartType: string): DeckGLBaseRenderer {
  return chartRegistry.get(chartType)!.createRenderer() as DeckGLBaseRenderer;
}

describe('geographic map registrations', () => {
  it('registers point-cloud geographic maps as deck.gl geographic charts', () => {
    for (const type of ['bubble_map', 'symbol_map', 'density_map', 'hexbin_map', 'geospatial_heatmap', 'route_map', 'voronoi_map']) {
      const def = chartRegistry.get(type);
      expect(def).toBeDefined();
      expect(def!.family).toBe('geographic');
      expect(def!.renderer).toBe('deckgl');
      expect(def!.compatibleShapes).toContain('geo_points');
    }
    expect(chartRegistry.get('bubble_map')!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon', 'value']);
    expect(chartRegistry.get('symbol_map')!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon', 'category']);
    expect(chartRegistry.get('density_map')!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon']);
    expect(chartRegistry.get('hexbin_map')!.optionalColumns?.map((col) => col.role)).toEqual(['value']);
    expect(chartRegistry.get('geospatial_heatmap')!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon', 'value']);
    expect(chartRegistry.get('route_map')!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon', 'order']);
    expect(chartRegistry.get('voronoi_map')!.optionalColumns?.map((col) => col.role)).toEqual(['value']);
  });
});

describe('density_map renderer', () => {
  it('builds a screen grid aggregation layer for valid coordinates', () => {
    const [layer] = renderer('density_map').buildLayers(dataView(), config('density_map', { cellSize: 36, opacity: 0.5 }), theme());
    const props = layer.props as unknown as DensityProps;
    expect(props.data).toHaveLength(3);
    expect(props.getPosition(props.data[0])).toEqual([-122.3321, 47.6062]);
    expect(props.getWeight(props.data[0])).toBe(1);
    expect(props.cellSizePixels).toBe(36);
    expect(props.cellMarginPixels).toBe(1);
    expect(props.colorRange).toEqual([[0, 0, 0, 128], [255, 255, 255, 128]]);
    expect(props.colorScaleType).toBe('linear');
    expect(props.aggregation).toBe('COUNT');
    expect(props.gpuAggregation).toBe(false);
  });

  it('passes a centered map view state for density maps', () => {
    deckProps.length = 0;
    render(<>{renderer('density_map').render(dataView(), config('density_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
  });
});

describe('hexbin_map renderer', () => {
  it('builds weighted hexagonal aggregation bins', () => {
    const [layer] = renderer('hexbin_map').buildLayers(dataView(), config('hexbin_map', { radiusMeters: 250000, coverage: 0.7, opacity: 0.6 }), theme());
    const props = layer.props as unknown as HexbinProps;
    expect(props.data).toHaveLength(3);
    expect(props.getPosition(props.data[1])).toEqual([-122.4194, 37.7749]);
    expect(props.getColorWeight(props.data[0])).toBe(82);
    expect(props.getColorWeight({})).toBe(1);
    expect(props.getElevationWeight({})).toBe(1);
    expect(props.radius).toBe(250000);
    expect(props.coverage).toBe(0.7);
    expect(props.extruded).toBe(false);
    expect(props.colorRange).toEqual([[0, 0, 0, 153], [255, 255, 255, 153]]);
    expect(props.colorAggregation).toBe('SUM');
    expect(props.elevationAggregation).toBe('SUM');
    expect(props.gpuAggregation).toBe(false);
  });

  it('passes a centered map view state for hexbin maps', () => {
    deckProps.length = 0;
    render(<>{renderer('hexbin_map').render(dataView(), config('hexbin_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.zoom).toBeGreaterThan(1);
  });
});

describe('geospatial_heatmap renderer', () => {
  it('builds a weighted heatmap layer', () => {
    const [layer] = renderer('geospatial_heatmap').buildLayers(dataView(), config('geospatial_heatmap', { radiusPixels: 60, intensity: 2.5, opacity: 0.55 }), theme());
    const props = layer.props as unknown as HeatmapProps;
    expect(props.data.map((point) => point.value)).toEqual([82, 95, 91]);
    expect(props.getPosition(props.data[2])).toEqual([-74.006, 40.7128]);
    expect(props.getWeight(props.data[1])).toBe(95);
    expect(props.getWeight({})).toBe(1);
    expect(props.radiusPixels).toBe(60);
    expect(props.intensity).toBe(2.5);
    expect(props.colorRange).toEqual([[0, 0, 0, 140], [255, 255, 255, 140]]);
    expect(props.aggregation).toBe('SUM');
  });

  it('passes a centered map view state for heatmaps', () => {
    deckProps.length = 0;
    render(<>{renderer('geospatial_heatmap').render(dataView(), config('geospatial_heatmap'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
  });
});

describe('bubble_map renderer', () => {
  it('sizes valid geographic points from the value column', () => {
    const [layer] = renderer('bubble_map').buildLayers(dataView(), config('bubble_map', { minRadius: 4, maxRadius: 20, opacity: 0.5 }), theme());
    const props = layer.props as unknown as ScatterProps;
    expect(props.data.map((point) => point.value)).toEqual([82, 95, 91]);
    expect(props.getPosition(props.data[0])).toEqual([-122.3321, 47.6062]);
    expect(props.getRadius(props.data[0])).toBeCloseTo(4);
    expect(props.getRadius(props.data[1])).toBeCloseTo(20);
    expect(props.radiusMinPixels).toBe(4);
    expect(props.radiusMaxPixels).toBe(20);
    expect(props.getFillColor).toEqual([51, 102, 153, 128]);
  });

  it('passes a centered map view state to DeckGLChart', () => {
    deckProps.length = 0;
    render(<>{renderer('bubble_map').render(dataView(), config('bubble_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
  });

  it('keeps max radius at least min radius', () => {
    const [layer] = renderer('bubble_map').buildLayers(dataView(), config('bubble_map', { minRadius: 12, maxRadius: 6 }), theme());
    const props = layer.props as unknown as ScatterProps;
    expect(props.radiusMaxPixels).toBe(12);
  });

  it('uses foreground color when the theme palette is empty', () => {
    const [layer] = renderer('bubble_map').buildLayers(dataView(), config('bubble_map'), { ...theme(), colorScale: [] });
    const props = layer.props as unknown as ScatterProps;
    expect(props.getFillColor).toEqual([221, 238, 255, 184]);
  });
});

describe('symbol_map renderer', () => {
  it('builds category-colored points plus category initial labels', () => {
    const layers = renderer('symbol_map').buildLayers(dataView(), config('symbol_map', { radius: 11, labelSize: 14, opacity: 0.6 }), theme());
    const pointProps = layers[0].props as unknown as ScatterProps;
    const labelProps = layers[1].props as unknown as TextProps;
    const color = pointProps.getFillColor as (point: { category?: string }) => [number, number, number, number];

    expect(layers).toHaveLength(2);
    expect(pointProps.getPosition(pointProps.data[0])).toEqual([-122.3321, 47.6062]);
    expect(pointProps.getRadius(pointProps.data[0])).toBe(11);
    expect(pointProps.radiusMinPixels).toBe(11);
    expect(color(pointProps.data[0])).toEqual([51, 102, 153, 153]);
    expect(color(pointProps.data[2])).toEqual([204, 85, 0, 153]);
    expect(color({ category: undefined })).toEqual([51, 102, 153, 153]);
    expect(labelProps.getPosition(labelProps.data[0] as { latitude: number; longitude: number })).toEqual([-122.3321, 47.6062]);
    expect(labelProps.getText(labelProps.data[0])).toBe('W');
    expect(labelProps.getText({ category: undefined })).toBe('');
    expect(labelProps.getSize()).toBe(14);
    expect(labelProps.getColor).toEqual([221, 238, 255, 242]);
    expect(labelProps.fontFamily).toBe('Arial');
  });

  it('passes a centered map view state to DeckGLChart', () => {
    deckProps.length = 0;
    render(<>{renderer('symbol_map').render(dataView(), config('symbol_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
  });

  it('indexes missing categories as the default symbol category', () => {
    const missingCategory: DataView = {
      ...dataView(),
      columnArrays: { ...dataView().columnArrays, category: [undefined, 'West', null, 'Invalid', 'East'] },
    };
    const [layer] = renderer('symbol_map').buildLayers(missingCategory, config('symbol_map'), theme());
    const props = layer.props as unknown as ScatterProps;
    const color = props.getFillColor as (point: { category?: string }) => [number, number, number, number];
    expect(props.data[0].category).toBeUndefined();
    expect(color(props.data[0])).toEqual([51, 102, 153, 204]);
    expect(color(props.data[1])).toEqual([204, 85, 0, 204]);
  });
});

describe('route_map renderer', () => {
  it('sorts points by order and builds a single route path', () => {
    const layers = renderer('route_map').buildLayers(dataView(), config('route_map', { lineWidth: 7, pointRadius: 6, opacity: 0.5 }), theme());
    const pathProps = layers[0].props as unknown as PathProps;
    const pointProps = layers[1].props as unknown as ScatterProps;

    expect(pathProps.data).toHaveLength(1);
    expect(pathProps.getPath(pathProps.data[0])).toEqual([
      [-122.4194, 37.7749],
      [-122.3321, 47.6062],
      [-74.006, 40.7128],
    ]);
    expect(pathProps.getWidth()).toBe(7);
    expect(pathProps.widthMinPixels).toBe(7);
    expect(pathProps.widthMaxPixels).toBe(7);
    expect(pointProps.data.map((point) => point.order)).toEqual([1, 2, 5]);
    expect(pointProps.getPosition(pointProps.data[0])).toEqual([-122.4194, 37.7749]);
    expect(pointProps.getRadius(pointProps.data[0])).toBe(6);
    expect(pointProps.radiusMinPixels).toBe(6);
  });

  it('omits the path layer data when fewer than two valid route points exist', () => {
    const onePoint: DataView = {
      ...dataView(),
      columnArrays: {
        latitude: [47.6062],
        longitude: [-122.3321],
        order: [1],
      },
    };
    const [pathLayer] = renderer('route_map').buildLayers(onePoint, config('route_map'), theme());
    expect((pathLayer.props as unknown as PathProps).data).toEqual([]);
  });

  it('sorts missing route order values before numbered stops', () => {
    const missingOrder: DataView = {
      ...dataView(),
      columnArrays: { ...dataView().columnArrays, order: [undefined, 3, 7, 8, 1] },
    };
    const layers = renderer('route_map').buildLayers(missingOrder, config('route_map'), theme());
    const pointProps = layers[1].props as unknown as ScatterProps;
    expect(pointProps.data.map((point) => point.order)).toEqual([undefined, 1, 3]);
  });

  it('sorts numbered stops after an earlier missing route order', () => {
    const missingSecondOrder: DataView = {
      ...dataView(),
      columnArrays: { ...dataView().columnArrays, order: [3, undefined, 7, 8, 1] },
    };
    const layers = renderer('route_map').buildLayers(missingSecondOrder, config('route_map'), theme());
    const pointProps = layers[1].props as unknown as ScatterProps;
    expect(pointProps.data.map((point) => point.order)).toEqual([undefined, 1, 3]);
  });

  it('passes a centered map view state for route maps', () => {
    deckProps.length = 0;
    render(<>{renderer('route_map').render(dataView(), config('route_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
    expect(viewState.zoom).toBeGreaterThan(1);
  });
});

describe('voronoi_map renderer', () => {
  it('builds local partition polygons around valid coordinates', () => {
    const [layer] = renderer('voronoi_map').buildLayers(dataView(), config('voronoi_map', { opacity: 0.5, lineWidth: 3 }), theme());
    const props = layer.props as unknown as PolygonProps;
    expect(props.data).toHaveLength(3);
    expect(props.getPolygon(props.data[0])).toEqual(props.data[0].polygon);
    expect(props.data[0].polygon).toHaveLength(5);
    expect(props.getFillColor(props.data[0])).toEqual([51, 102, 153, 128]);
    expect(props.getFillColor(props.data[1])).toEqual([102, 153, 51, 128]);
    expect(props.getLineColor).toEqual([221, 238, 255, 217]);
    expect(props.getLineWidth()).toBe(3);
    expect(props.lineWidthMinPixels).toBe(3);
    expect(props.stroked).toBe(true);
    expect(props.filled).toBe(true);
    expect(props.extruded).toBe(false);
  });

  it('passes a centered map view state for voronoi maps', () => {
    deckProps.length = 0;
    render(<>{renderer('voronoi_map').render(dataView(), config('voronoi_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
  });
});

describe('geo-utils', () => {
  it('extracts optional labels and handles missing optional columns', () => {
    const points = finiteGeoPoints(dataView(), config('bubble_map'));
    expect(points[0]).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
      value: 82,
      category: 'West',
      order: 2,
      label: 'Seattle',
    });

    const minimal = finiteGeoPoints(dataView(), { chartType: 'x', columns: { lat: 'latitude', lon: 'longitude' }, options: {} });
    expect(minimal[0]).toEqual({ latitude: 47.6062, longitude: -122.3321 });
  });

  it('covers color and radius defensive branches', () => {
    expect(hexToRgba('#369', 2, '#def')).toEqual([51, 102, 153, 255]);
    expect(hexToRgba('nope', -1, '#def')).toEqual([221, 238, 255, 0]);
    expect(paletteColor({ ...theme(), colorScale: [] }, 4, 0.5)).toEqual([221, 238, 255, 128]);
    expect(sequentialColorRange({ ...theme(), sequentialScale: [], colorScale: [] } as unknown as ThemeTokens, 0.25)).toEqual([[221, 238, 255, 64]]);
    expect(numericExtent([undefined, Number.NaN])).toEqual([0, 0]);
    expect(scaledRadius(undefined, [1, 9], 2, 10)).toBe(2);
    expect(scaledRadius(5, [5, 5], 2, 10)).toBe(6);
    expect(scaledRadius(20, [1, 9], 2, 10)).toBe(10);
  });

  it('builds deterministic rectangular cells for point partitions', () => {
    expect(rectangularGeoCells([])).toEqual([]);
    const [single] = rectangularGeoCells([{ latitude: 10, longitude: 20 }]);
    expect(single.polygon).toEqual([
      [19.5, 9.5],
      [20.5, 9.5],
      [20.5, 10.5],
      [19.5, 10.5],
      [19.5, 9.5],
    ]);
  });
});

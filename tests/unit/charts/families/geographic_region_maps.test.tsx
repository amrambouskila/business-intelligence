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

import '@/charts/families/geographic/choropleth_map';
import '@/charts/families/geographic/filled_map';
import '@/charts/families/geographic/cartogram';
import '@/charts/families/geographic/flow_map';
import '@/charts/families/geographic/isochrone_contour_map';
import '@/charts/families/geographic/tile_grid_map';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import {
  finiteGeoFlows,
  finiteGeoRegions,
  mapViewStateForFlows,
  mapViewStateForRegions,
  scaledPolygon,
  tileGridRegions,
} from '@/charts/families/geographic/geo-utils';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type RegionDatum = {
  region: string;
  value: number;
  polygon: Array<[number, number]>;
  center: [number, number];
};

type FlowDatum = {
  origin: [number, number];
  destination: [number, number];
  value: number;
};

type PolygonProps = {
  data: RegionDatum[];
  getPolygon: (region: RegionDatum) => Array<[number, number]>;
  getFillColor: (region: RegionDatum) => [number, number, number, number];
  getLineColor: [number, number, number, number];
  getLineWidth: () => number;
  lineWidthMinPixels: number;
  stroked: boolean;
  filled: boolean;
  extruded: boolean;
};

type CartogramProps = Omit<PolygonProps, 'getLineWidth'> & {
  getLineWidth: number;
};

type ArcProps = {
  data: FlowDatum[];
  getSourcePosition: (flow: FlowDatum) => [number, number];
  getTargetPosition: (flow: FlowDatum) => [number, number];
  getSourceColor: [number, number, number, number];
  getTargetColor: [number, number, number, number];
  getWidth: (flow: FlowDatum) => number;
  widthMinPixels: number;
  widthMaxPixels: number;
  greatCircle: boolean;
};

type ContourProps = {
  data: Array<{ latitude: number; longitude: number; value?: number }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getWeight: (point: { value?: number }) => number;
  cellSize: number;
  contours: Array<{ threshold: number; color: [number, number, number, number]; strokeWidth: number }>;
  aggregation: string;
  gpuAggregation: boolean;
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

function regionDataView(): DataView {
  return {
    sourceId: 'geo-region',
    rows: [],
    filters: [],
    rowCount: 6,
    columns: [
      { name: 'region', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 },
    ],
    columnArrays: {
      region: ['West', 'West', 'East', 'Atlantis', null, 'Bad Value'],
      value: [10, 20, 40, 30, 5, 'bad'],
    },
  };
}

function flowDataView(): DataView {
  return {
    sourceId: 'geo-flow',
    rows: [],
    filters: [],
    rowCount: 4,
    columns: [
      { name: 'origin_lat', type: 'geo_point', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'origin_lon', type: 'geo_point', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'dest_lat', type: 'geo_point', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'dest_lon', type: 'geo_point', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    columnArrays: {
      origin_lat: [47.6062, 37.7749, 95, 40.7128],
      origin_lon: [-122.3321, -122.4194, -100, -74.006],
      dest_lat: [37.7749, 40.7128, 41, 'bad'],
      dest_lon: [-122.4194, -74.006, -87, -80],
      value: [82, 95, 70, 61],
    },
  };
}

function pointDataView(): DataView {
  return {
    ...flowDataView(),
    columns: [
      { name: 'latitude', type: 'geo_point', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'longitude', type: 'geo_point', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    columnArrays: {
      latitude: [47.6062, 37.7749, 40.7128],
      longitude: [-122.3321, -122.4194, -74.006],
      value: [60, 78, 96],
    },
  };
}

function config(chartType: string, columns: ChartConfig['columns'], options: ChartConfig['options'] = {}): ChartConfig {
  return { chartType, columns, options };
}

function regionConfig(chartType: string, options: ChartConfig['options'] = {}): ChartConfig {
  return config(chartType, { region: 'region', value: 'value' }, options);
}

function flowConfig(options: ChartConfig['options'] = {}): ChartConfig {
  return config('flow_map', {
    origin_lat: 'origin_lat',
    origin_lon: 'origin_lon',
    dest_lat: 'dest_lat',
    dest_lon: 'dest_lon',
    value: 'value',
  }, options);
}

function pointConfig(chartType: string, options: ChartConfig['options'] = {}): ChartConfig {
  return config(chartType, { lat: 'latitude', lon: 'longitude', value: 'value' }, options);
}

function renderer(chartType: string): DeckGLBaseRenderer {
  return chartRegistry.get(chartType)!.createRenderer() as DeckGLBaseRenderer;
}

describe('remaining geographic map registrations', () => {
  it('registers region, flow, contour, and tile maps as deck.gl geographic charts', () => {
    for (const type of ['choropleth_map', 'filled_map', 'cartogram', 'flow_map', 'isochrone_contour_map', 'tile_grid_map']) {
      const def = chartRegistry.get(type);
      expect(def).toBeDefined();
      expect(def!.family).toBe('geographic');
      expect(def!.renderer).toBe('deckgl');
    }
    expect(chartRegistry.get('flow_map')!.requiredColumns.map((col) => col.role)).toEqual([
      'origin_lat',
      'origin_lon',
      'dest_lat',
      'dest_lon',
      'value',
    ]);
    expect(chartRegistry.get('tile_grid_map')!.requiredColumns.map((col) => col.role)).toEqual(['region', 'value']);
  });
});

describe('region polygon maps', () => {
  it('builds choropleth polygons with aggregated region values', () => {
    const [layer] = renderer('choropleth_map').buildLayers(regionDataView(), regionConfig('choropleth_map', { opacity: 0.5, lineWidth: 3 }), theme());
    const props = layer.props as unknown as PolygonProps;
    expect(props.data.map((region) => [region.region, region.value])).toEqual([
      ['West', 30],
      ['East', 40],
      ['Atlantis', 30],
    ]);
    expect(props.getPolygon(props.data[0])).toEqual(props.data[0].polygon);
    expect(props.getFillColor(props.data[0])).toEqual([51, 102, 153, 128]);
    expect(props.getFillColor(props.data[1])).toEqual([102, 153, 51, 128]);
    expect(props.getLineColor).toEqual([221, 238, 255, 217]);
    expect(props.getLineWidth()).toBe(3);
    expect(props.lineWidthMinPixels).toBe(3);
    expect(props.stroked).toBe(true);
    expect(props.filled).toBe(true);
    expect(props.extruded).toBe(false);
  });

  it('builds filled maps with background outline color', () => {
    const [layer] = renderer('filled_map').buildLayers(regionDataView(), regionConfig('filled_map', { opacity: 0.6, lineWidth: 4 }), theme());
    const props = layer.props as unknown as PolygonProps;
    expect(props.getPolygon(props.data[0])).toEqual(props.data[0].polygon);
    expect(props.getFillColor(props.data[1])).toEqual([102, 153, 51, 153]);
    expect(props.getLineColor).toEqual([0, 17, 34, 242]);
    expect(props.getLineWidth()).toBe(4);
  });

  it('builds scaled cartogram polygons and keeps max scale at least min scale', () => {
    const [layer] = renderer('cartogram').buildLayers(regionDataView(), regionConfig('cartogram', { minScale: 0.8, maxScale: 0.5, opacity: 0.4 }), theme());
    const props = layer.props as unknown as CartogramProps;
    expect(props.getPolygon(props.data[0])).toEqual(scaledPolygon(props.data[0], 0.8));
    expect(props.getFillColor(props.data[1])).toEqual([102, 153, 51, 102]);
    expect(props.getLineWidth).toBe(1);
  });

  it('builds tile grid polygons with deterministic centers', () => {
    const [layer] = renderer('tile_grid_map').buildLayers(regionDataView(), regionConfig('tile_grid_map', { opacity: 0.5, gapWidth: 5 }), theme());
    const props = layer.props as unknown as PolygonProps;
    expect(props.getPolygon(props.data[0])).toEqual(props.data[0].polygon);
    expect(props.data.map((region) => region.center)).toEqual([
      [-121.25, 27.25],
      [-114.25, 27.25],
      [-107.25, 27.25],
    ]);
    expect(props.getFillColor(props.data[1])).toEqual([102, 153, 51, 128]);
    expect(props.getLineColor).toEqual([0, 17, 34, 242]);
    expect(props.getLineWidth()).toBe(5);
  });

  it('passes centered region view states to DeckGLChart', () => {
    deckProps.length = 0;
    render(<>{renderer('choropleth_map').render(regionDataView(), regionConfig('choropleth_map'), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-97, 0);
    expect(viewState.latitude).toBeCloseTo(33.75, 4);
  });

  it('passes centered view states for filled, cartogram, tile, and contour maps', () => {
    deckProps.length = 0;
    render(<>
      {renderer('filled_map').render(regionDataView(), regionConfig('filled_map'), theme())}
      {renderer('cartogram').render(regionDataView(), regionConfig('cartogram'), theme())}
      {renderer('tile_grid_map').render(regionDataView(), regionConfig('tile_grid_map'), theme())}
      {renderer('isochrone_contour_map').render(pointDataView(), pointConfig('isochrone_contour_map'), theme())}
    </>);
    expect((deckProps.at(-4)!.initialViewState as MapViewState).longitude).toBeCloseTo(-97, 0);
    expect((deckProps.at(-3)!.initialViewState as MapViewState).longitude).toBeCloseTo(-97, 0);
    expect((deckProps.at(-2)!.initialViewState as MapViewState).longitude).toBeCloseTo(-114.25, 0);
    expect((deckProps.at(-1)!.initialViewState as MapViewState).longitude).toBeCloseTo(-98.2127, 4);
  });
});

describe('flow_map renderer', () => {
  it('filters invalid flows and builds weighted great-circle arcs', () => {
    const [layer] = renderer('flow_map').buildLayers(flowDataView(), flowConfig({ minWidth: 3, maxWidth: 9, opacity: 0.5 }), theme());
    const props = layer.props as unknown as ArcProps;
    expect(props.data).toHaveLength(2);
    expect(props.getSourcePosition(props.data[0])).toEqual([-122.3321, 47.6062]);
    expect(props.getTargetPosition(props.data[1])).toEqual([-74.006, 40.7128]);
    expect(props.getSourceColor).toEqual([51, 102, 153, 128]);
    expect(props.getTargetColor).toEqual([204, 85, 0, 128]);
    expect(props.getWidth(props.data[0])).toBe(3);
    expect(props.getWidth(props.data[1])).toBe(9);
    expect(props.widthMinPixels).toBe(3);
    expect(props.widthMaxPixels).toBe(9);
    expect(props.greatCircle).toBe(true);
  });

  it('passes centered flow view states to DeckGLChart', () => {
    deckProps.length = 0;
    render(<>{renderer('flow_map').render(flowDataView(), flowConfig(), theme())}</>);
    const viewState = deckProps.at(-1)!.initialViewState as MapViewState;
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
  });
});

describe('isochrone_contour_map renderer', () => {
  it('builds mean contour thresholds over weighted geo points', () => {
    const [layer] = renderer('isochrone_contour_map').buildLayers(pointDataView(), pointConfig('isochrone_contour_map', { cellSizeMeters: 250000, opacity: 0.5 }), theme());
    const props = layer.props as unknown as ContourProps;
    expect(props.data.map((point) => point.value)).toEqual([60, 78, 96]);
    expect(props.getPosition(props.data[0])).toEqual([-122.3321, 47.6062]);
    expect(props.getWeight(props.data[2])).toBe(96);
    expect(props.getWeight({})).toBe(1);
    expect(props.cellSize).toBe(250000);
    expect(props.contours).toEqual([
      { threshold: 60, color: [51, 102, 153, 128], strokeWidth: 2 },
      { threshold: 75, color: [204, 85, 0, 128], strokeWidth: 2 },
      { threshold: 90, color: [102, 153, 51, 128], strokeWidth: 2 },
    ]);
    expect(props.aggregation).toBe('MEAN');
    expect(props.gpuAggregation).toBe(false);
  });
});

describe('geo region and flow helpers', () => {
  it('covers empty and fallback helper paths', () => {
    expect(finiteGeoRegions({ ...regionDataView(), columnArrays: {} }, regionConfig('choropleth_map'))).toEqual([]);
    expect(mapViewStateForRegions([])).toEqual({ longitude: 0, latitude: 0, zoom: 1, pitch: 0, bearing: 0 });
    expect(finiteGeoFlows({ ...flowDataView(), columnArrays: {} }, flowConfig())).toEqual([]);
    expect(mapViewStateForFlows([])).toEqual({ longitude: 0, latitude: 0, zoom: 1, pitch: 0, bearing: 0 });
    expect(tileGridRegions([])).toEqual([]);
  });
});

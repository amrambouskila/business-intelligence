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

import '@/charts/families/geographic/point_map';
import { chartRegistry } from '@/charts/registry';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type PointLayerProps = {
  data: Array<{ latitude: number; longitude: number }>;
  getPosition: (point: { latitude: number; longitude: number }) => [number, number];
  getRadius: () => number;
  getFillColor: [number, number, number, number];
  getLineColor: [number, number, number, number];
  radiusUnits: string;
  radiusMinPixels: number;
  radiusMaxPixels: number;
  stroked: boolean;
  filled: boolean;
};

function theme(): ThemeTokens {
  return {
    mode: 'dark',
    background: '#001122',
    foreground: '#ddeeff',
    gridColor: '#333',
    axisColor: '#666',
    colorScale: ['#336699'],
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
    ],
    columnArrays: {
      latitude: [47.6062, 37.7749, 'bad', 91, 40.7128],
      longitude: [-122.3321, -122.4194, -75, -100, -74.006],
    },
  };
}

function config(options: ChartConfig['options'] = {}): ChartConfig {
  return {
    chartType: 'point_map',
    columns: { lat: 'latitude', lon: 'longitude' },
    options,
  };
}

function renderer(): DeckGLBaseRenderer {
  return chartRegistry.get('point_map')!.createRenderer() as DeckGLBaseRenderer;
}

function pointLayerProps(options: ChartConfig['options'] = {}, tokens = theme()): PointLayerProps {
  const [layer] = renderer().buildLayers(dataView(), config(options), tokens);
  return layer.props as unknown as PointLayerProps;
}

describe('point_map registration', () => {
  it('registers as the first geographic deck.gl chart', () => {
    const def = chartRegistry.get('point_map');
    expect(def).toBeDefined();
    expect(def!.family).toBe('geographic');
    expect(def!.renderer).toBe('deckgl');
    expect(def!.compatibleShapes).toContain('geo_points');
    expect(def!.requiredColumns.map((col) => col.role)).toEqual(['lat', 'lon']);
  });
});

describe('point_map renderer', () => {
  it('filters invalid coordinates and builds lon/lat scatter positions', () => {
    const props = pointLayerProps();
    expect(props.data).toEqual([
      { latitude: 47.6062, longitude: -122.3321 },
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 40.7128, longitude: -74.006 },
    ]);
    expect(props.getPosition(props.data[0])).toEqual([-122.3321, 47.6062]);
  });

  it('applies radius and opacity options to stable pixel-sized points', () => {
    const props = pointLayerProps({ radius: 12, opacity: 0.5 });
    expect(props.getRadius()).toBe(12);
    expect(props.radiusUnits).toBe('pixels');
    expect(props.radiusMinPixels).toBe(12);
    expect(props.radiusMaxPixels).toBe(12);
    expect(props.stroked).toBe(true);
    expect(props.filled).toBe(true);
    expect(props.getFillColor).toEqual([51, 102, 153, 128]);
    expect(props.getLineColor).toEqual([0, 17, 34, 230]);
  });

  it('falls back to theme foreground when the palette color is not a hex color', () => {
    const tokens = { ...theme(), colorScale: ['not-a-color'] };
    const props = pointLayerProps({}, tokens);
    expect(props.getFillColor).toEqual([221, 238, 255, 191]);
  });

  it('expands short hex palette and fallback colors', () => {
    const shortPalette = pointLayerProps({}, { ...theme(), colorScale: ['#369'] });
    expect(shortPalette.getFillColor).toEqual([51, 102, 153, 191]);

    const shortFallback = pointLayerProps({}, { ...theme(), foreground: '#def', colorScale: ['not-a-color'] });
    expect(shortFallback.getFillColor).toEqual([221, 238, 255, 191]);
  });

  it('uses theme foreground when the color scale is empty', () => {
    const props = pointLayerProps({}, { ...theme(), colorScale: [] });
    expect(props.getFillColor).toEqual([221, 238, 255, 191]);
  });

  it('passes a centered map view state to DeckGLChart', () => {
    deckProps.length = 0;
    render(<>{renderer().render(dataView(), config(), theme())}</>);
    const props = deckProps.at(-1)!;
    const viewState = props.initialViewState as MapViewState;
    expect(props.layers).toHaveLength(1);
    expect(viewState.longitude).toBeCloseTo(-98.2127, 4);
    expect(viewState.latitude).toBeCloseTo(42.69055, 4);
    expect(viewState.zoom).toBeGreaterThan(1);
    expect(viewState.pitch).toBe(0);
    expect(viewState.bearing).toBe(0);
  });

  it('uses a neutral map view state when no valid coordinates exist', () => {
    deckProps.length = 0;
    const empty: DataView = { ...dataView(), columnArrays: {} };
    render(<>{renderer().render(empty, config(), theme())}</>);
    expect(deckProps.at(-1)!.initialViewState).toEqual({
      longitude: 0,
      latitude: 0,
      zoom: 1,
      pitch: 0,
      bearing: 0,
    });
  });
});

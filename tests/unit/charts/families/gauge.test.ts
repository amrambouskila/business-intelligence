import { describe, it, expect, vi } from 'vitest';
import '@/charts/families/specialized/gauge';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { Canvas2DBaseRenderer } from '@/charts/renderers/canvas2d-renderer';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function emptyPaletteTheme(): ThemeTokens {
  return { ...theme(), colorScale: [] };
}

function dataView(value: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value },
    columns: [{ name: 'value', type: 'numeric', nullable: false, uniqueCount: value.length, nullCount: 0 }],
    rowCount: value.length,
  };
}

function renderer(): Canvas2DBaseRenderer {
  return chartRegistry.get('gauge')!.createRenderer() as Canvas2DBaseRenderer;
}

function config(options: Record<string, unknown> = {}): ChartConfig {
  return { chartType: 'gauge', columns: { value: 'value' }, options };
}

interface StrokeCall {
  strokeStyle: string;
  lineWidth: number;
}

interface TextCall {
  text: string;
  x: number;
  y: number;
  fillStyle: string;
  font: string;
}

interface ArcCall {
  startAngle: number;
  endAngle: number;
}

function mockContext() {
  const strokeCalls: StrokeCall[] = [];
  const textCalls: TextCall[] = [];
  const arcCalls: ArcCall[] = [];
  const context = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    font: '',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn((_x: number, _y: number, _radius: number, startAngle: number, endAngle: number) => {
      arcCalls.push({ startAngle, endAngle });
    }),
    stroke: vi.fn(() => {
      strokeCalls.push({
        strokeStyle: String(context.strokeStyle),
        lineWidth: Number(context.lineWidth),
      });
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      textCalls.push({
        text,
        x,
        y,
        fillStyle: String(context.fillStyle),
        font: String(context.font),
      });
    }),
  } as unknown as CanvasRenderingContext2D;

  return { context, strokeCalls, textCalls, arcCalls };
}

function drawGauge(values: unknown[], options: Record<string, unknown> = {}, tokens = theme()) {
  const ctx = mockContext();
  renderer().draw(ctx.context, { width: 320, height: 200, pixelRatio: 1 }, dataView(values), config(options), tokens);
  return ctx;
}

describe('gauge registration', () => {
  it('registers under type "gauge" with the specialized family', () => {
    const def = chartRegistry.get('gauge');
    expect(def).toBeDefined();
    expect(def!.type).toBe('gauge');
    expect(def!.family).toBe('specialized');
    expect(def!.name).toBe('Gauge');
    expect(def!.renderer).toBe('canvas2d');
  });

  it('requires a numeric value column over single_numeric/generic shapes', () => {
    const def = chartRegistry.get('gauge')!;
    expect(def.requiredColumns).toEqual([
      { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    ]);
    expect(def.compatibleShapes).toEqual(['single_numeric', 'generic']);
  });

  it('declares an aggregate select option defaulting to mean', () => {
    const def = chartRegistry.get('gauge')!;
    const agg = def.options!.find((o) => o.key === 'aggregate')!;
    expect(agg.control).toBe('select');
    expect(agg.default).toBe('mean');
    expect(agg.choices).toEqual([
      { value: 'mean', label: 'Mean' },
      { value: 'max', label: 'Max' },
      { value: 'min', label: 'Min' },
      { value: 'sum', label: 'Sum' },
    ]);
  });
});

describe('gauge draw', () => {
  it('draws a themed gauge with the mean by default and max = largest finite value', () => {
    const { context, strokeCalls, textCalls } = drawGauge([10, 20, 30]);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
    expect(strokeCalls[0]).toMatchObject({ strokeStyle: '#333' });
    expect(strokeCalls[1]).toMatchObject({ strokeStyle: '#f00' });
    expect(strokeCalls[0].lineWidth).toBeCloseTo(12.48);
    expect(strokeCalls[1].lineWidth).toBeCloseTo(12.48);
    expect(textCalls.map((call) => call.text)).toEqual(['20.00', '0 - 30.00']);
    expect(textCalls[0]).toMatchObject({ fillStyle: '#fff', font: '28px Arial' });
    expect(textCalls[1]).toMatchObject({ fillStyle: '#666', font: '10px Arial' });
  });

  it('aggregates with max when selected', () => {
    expect(drawGauge([10, 20, 30], { aggregate: 'max' }).textCalls[0].text).toBe('30.00');
  });

  it('aggregates with min when selected', () => {
    expect(drawGauge([10, 20, 30], { aggregate: 'min' }).textCalls[0].text).toBe('10.00');
  });

  it('aggregates with sum when selected', () => {
    expect(drawGauge([10, 20, 30], { aggregate: 'sum' }).textCalls[0].text).toBe('60.00');
  });

  it('falls back to mean for invalid aggregate options', () => {
    expect(drawGauge([10, 20, 30], { aggregate: 'median' }).textCalls[0].text).toBe('20.00');
  });

  it('falls back to a max of 100 when every finite value is <= 0', () => {
    const { textCalls } = drawGauge([-5, -10, 0], { aggregate: 'min' });
    expect(textCalls.map((call) => call.text)).toEqual(['-10.00', '0 - 100.00']);
  });

  it('uses the foreground accent when the palette is empty', () => {
    expect(drawGauge([10, 20, 30], {}, emptyPaletteTheme()).strokeCalls[1].strokeStyle).toBe('#fff');
  });

  it('drops non-finite values before aggregating', () => {
    const { textCalls } = drawGauge([10, NaN, 20, Infinity, 30, -Infinity], { aggregate: 'sum' });
    expect(textCalls.map((call) => call.text)).toEqual(['60.00', '0 - 30.00']);
  });

  it('rounds the displayed value to 2 decimals', () => {
    expect(drawGauge([1, 2, 2]).textCalls[0].text).toBe('1.67');
  });

  it('clamps progress above the gauge max and below zero', () => {
    const aboveMax = drawGauge([10, 20, 30], { aggregate: 'sum' });
    const belowZero = drawGauge([-5, -10, 0], { aggregate: 'min' });
    expect(aboveMax.arcCalls[1].endAngle).toBe(0);
    expect(belowZero.arcCalls[1].endAngle).toBe(Math.PI);
  });
});

describe('gauge empty guard', () => {
  it('renders the empty state when there are no finite values', () => {
    const el = renderer().render(dataView([NaN, Infinity, -Infinity]), config(), theme());
    expect((el.props as { message?: string }).message).toBe('No numeric value to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const cfg: ChartConfig = { chartType: 'gauge', columns: { value: 'missing' }, options: {} };
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No numeric value to chart');
  });

  it('renders a canvas element when finite values are present', () => {
    const el = renderer().render(dataView([10, 20, 30]), config(), theme());
    expect((el.props as { message?: string }).message).toBeUndefined();
    expect((el.props as { 'data-testid'?: string })['data-testid']).toBeUndefined();
    expect((el.props as { draw?: unknown }).draw).toBeDefined();
  });
});

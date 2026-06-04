import { describe, it, expect, vi } from 'vitest';
import '@/charts/families/matrix/image_raster_plot';
import { chartRegistry } from '@/charts/registry';
import { ReglBaseRenderer } from '@/charts/renderers/regl-renderer';
import type { ReglDraw } from '@/charts/renderers/ReglChart';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type RasterDrawProps = {
  positions: number[];
  colors: number[];
  count: number;
};

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000000', '#ffffff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'image_raster_plot', columns: { row: 'row', col: 'col', intensity: 'intensity' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 4 };
}

function renderer(): ReglBaseRenderer {
  return chartRegistry.get('image_raster_plot')!.createRenderer() as ReglBaseRenderer;
}

function mockRegl() {
  const drawCalls: RasterDrawProps[] = [];
  const commandConfigs: unknown[] = [];
  const regl = vi.fn((commandConfig: unknown) => {
    commandConfigs.push(commandConfig);
    return (props: RasterDrawProps) => drawCalls.push(props);
  });
  const instance = Object.assign(regl, {
    clear: vi.fn(),
    prop: vi.fn((_name: keyof RasterDrawProps) => `prop:${String(_name)}`),
  }) as unknown as Parameters<ReglDraw>[0];
  return { instance, drawCalls, commandConfigs, clear: instance.clear };
}

describe('image_raster_plot registration', () => {
  it('registers intensity as the numeric role', () => {
    const def = chartRegistry.get('image_raster_plot')!;
    expect(def.family).toBe('matrix');
    expect(def.renderer).toBe('regl');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'intensity']);
  });
});

describe('image_raster_plot draw', () => {
  it('builds regl triangle buffers from finite raster intensities', () => {
    const regl = mockRegl();
    renderer().draw(regl.instance, { width: 320, height: 200, pixelRatio: 1 }, dv({
      row: [0, 0, 1, 1],
      col: [0, 1, 0, 1],
      intensity: [5, 15, 25, 35],
    }), cfg, theme());

    expect(regl.clear).toHaveBeenCalledWith({ color: [0, 0, 0, 0], depth: 1 });
    expect(regl.commandConfigs).toHaveLength(1);
    expect(regl.drawCalls).toHaveLength(1);
    expect(regl.drawCalls[0].count).toBe(24);
    expect(regl.drawCalls[0].positions.slice(0, 12)).toEqual([
      -1, 1, 0, 1, -1, 0,
      -1, 0, 0, 1, 0, 0,
    ]);
    expect(regl.drawCalls[0].colors.slice(0, 24)).toEqual(Array(24).fill(0).map((_, i) => (i + 1) % 4 === 0 ? 1 : 0));
    expect(regl.drawCalls[0].colors.slice(-4)).toEqual([1, 1, 1, 1]);
  });

  it('drops non-finite cells and handles a flat intensity range', () => {
    const regl = mockRegl();
    renderer().draw(regl.instance, { width: 320, height: 200, pixelRatio: 1 }, dv({
      row: [0, 0],
      col: [0, 1],
      intensity: [10, Infinity],
    }), cfg, theme());

    expect(regl.drawCalls[0].count).toBe(6);
    expect(regl.drawCalls[0].colors.slice(0, 4)).toEqual([0.5, 0.5, 0.5, 1]);
  });

  it('falls back to white when theme colors are not valid hex colors', () => {
    const regl = mockRegl();
    renderer().draw(regl.instance, { width: 320, height: 200, pixelRatio: 1 }, dv({
      row: [0],
      col: [0],
      intensity: [10],
    }), cfg, { ...theme(), sequentialScale: ['bad', 'also-bad'], foreground: 'nope' });

    expect(regl.drawCalls[0].colors.slice(0, 4)).toEqual([1, 1, 1, 1]);
  });

  it('falls back to empty buffers when referenced columns are missing', () => {
    const regl = mockRegl();
    renderer().draw(regl.instance, { width: 320, height: 200, pixelRatio: 1 }, dv({}), cfg, theme());
    expect(regl.drawCalls[0]).toEqual({ positions: [], colors: [], count: 0 });
  });
});

describe('image_raster_plot empty guard', () => {
  it('renders the empty state when no finite intensities remain', () => {
    const el = renderer().render(dv({ row: [0], col: [0], intensity: [Infinity] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No raster intensities to chart');
  });

  it('renders a regl chart when at least one finite intensity exists', () => {
    const el = renderer().render(dv({ row: [0], col: [0], intensity: [5] }), cfg, theme());
    expect((el.props as { draw?: unknown }).draw).toBeDefined();
  });
});

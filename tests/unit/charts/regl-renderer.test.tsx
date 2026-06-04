import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReglBaseRenderer } from '@/charts/renderers/regl-renderer';
import type { ReglSize } from '@/charts/renderers/ReglChart';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ResizeCallback = ResizeObserverCallback;

const mockRegl = vi.hoisted(() => ({
  create: vi.fn(),
  poll: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('regl', () => ({
  default: mockRegl.create,
}));

const drawCalls: Array<{ width: number; height: number; pixelRatio: number; foreground: string }> = [];
const disconnect = vi.fn();
let resizeCallback: ResizeCallback | undefined;

class TestResizeObserver {
  constructor(callback: ResizeCallback) {
    resizeCallback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = disconnect;
}

function makeTheme(): ThemeTokens {
  return {
    mode: 'dark',
    background: '#000',
    foreground: '#fff',
    gridColor: '#333',
    axisColor: '#666',
    colorScale: ['#f00'],
    sequentialScale: ['#000', '#fff'],
    divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial',
    fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function makeDataView(rowCount = 1): DataView {
  return { sourceId: 's', rows: [], columnArrays: {}, columns: [], rowCount, filters: [] };
}

function makeConfig(): ChartConfig {
  return { chartType: 'test', columns: {}, options: {} };
}

class StubRenderer extends ReglBaseRenderer {
  draw(
    _regl: Parameters<ReglBaseRenderer['draw']>[0],
    size: ReglSize,
    _data: DataView,
    _config: ChartConfig,
    theme: ThemeTokens,
  ): void {
    drawCalls.push({ ...size, foreground: theme.foreground });
  }
}

class CustomEmptyRenderer extends StubRenderer {
  protected isEmpty(data: DataView): boolean {
    return data.rowCount < 2;
  }

  protected emptyMessage(): string {
    return 'Need at least two rows';
  }
}

class DestroyRenderer extends StubRenderer {
  destroy = vi.fn();
}

describe('ReglBaseRenderer', () => {
  let originalResizeObserver: typeof ResizeObserver;
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  const gl = { drawingBufferWidth: 1, drawingBufferHeight: 1 } as unknown as WebGLRenderingContext;

  beforeEach(() => {
    drawCalls.length = 0;
    disconnect.mockClear();
    resizeCallback = undefined;
    mockRegl.create.mockReset();
    mockRegl.poll.mockReset();
    mockRegl.destroy.mockReset();
    mockRegl.create.mockReturnValue({
      poll: mockRegl.poll,
      destroy: mockRegl.destroy,
    });
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) => (contextId === 'webgl' ? gl : null));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 180,
      top: 0,
      right: 320,
      bottom: 180,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    delete (HTMLCanvasElement.prototype as { clientWidth?: number }).clientWidth;
    delete (HTMLCanvasElement.prototype as { clientHeight?: number }).clientHeight;
    getContextSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('creates regl, sizes the canvas, polls, and draws', () => {
    const originalPixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    try {
      const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
      render(<>{element}</>);
      const canvas = screen.getByTestId('regl-chart') as HTMLCanvasElement;
      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(360);
      expect(mockRegl.create).toHaveBeenCalledWith({ canvas, gl });
      expect(mockRegl.poll).toHaveBeenCalledTimes(1);
      expect(drawCalls).toEqual([{ width: 320, height: 180, pixelRatio: 2, foreground: '#fff' }]);
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalPixelRatio,
      });
    }
  });

  it('redraws when the observed container resizes', () => {
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    resizeCallback?.([], {} as ResizeObserver);
    expect(drawCalls).toHaveLength(2);
    expect(mockRegl.poll).toHaveBeenCalledTimes(2);
  });

  it('falls back through canvas bounds, client size, and fixed dimensions', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return {
        width: this instanceof HTMLCanvasElement ? 240 : 0,
        height: this instanceof HTMLCanvasElement ? 120 : 0,
        top: 0,
        right: 240,
        bottom: 120,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });
    render(<>{new StubRenderer().render(makeDataView(), makeConfig(), makeTheme())}</>);
    expect(drawCalls.at(-1)).toMatchObject({ width: 240, height: 120 });

    drawCalls.length = 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, value: 180 });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, value: 90 });
    render(<>{new StubRenderer().render(makeDataView(), makeConfig(), makeTheme())}</>);
    expect(drawCalls.at(-1)).toMatchObject({ width: 180, height: 90 });

    drawCalls.length = 0;
    const originalPixelRatio = window.devicePixelRatio;
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, value: 0 });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, value: 0 });
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 0 });
    try {
      render(<>{new StubRenderer().render(makeDataView(), makeConfig(), makeTheme())}</>);
      expect(drawCalls.at(-1)).toMatchObject({ width: 640, height: 360, pixelRatio: 1 });
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalPixelRatio });
    }
  });

  it('uses the experimental WebGL context fallback when needed', () => {
    getContextSpy.mockImplementation((contextId: string) => (
      contextId === 'experimental-webgl' ? gl : null
    ));
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(mockRegl.create).toHaveBeenCalled();
    expect(drawCalls).toHaveLength(1);
  });

  it('renders an empty state when the renderer reports no drawable data', () => {
    const element = new CustomEmptyRenderer().render(makeDataView(1), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(screen.getByText('Need at least two rows')).toBeInTheDocument();
    expect(screen.queryByTestId('regl-chart')).toBeNull();
  });

  it('uses the default empty-state message for empty row sets', () => {
    const element = new StubRenderer().render(makeDataView(0), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('runs renderer cleanup and destroys regl on unmount', () => {
    const renderer = new DestroyRenderer();
    const element = renderer.render(makeDataView(), makeConfig(), makeTheme());
    const { unmount } = render(<>{element}</>);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(renderer.destroy).toHaveBeenCalledTimes(1);
    expect(mockRegl.destroy).toHaveBeenCalledTimes(1);
  });

  it('skips regl creation and drawing when WebGL is unavailable', () => {
    getContextSpy.mockReturnValue(null);
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(mockRegl.create).not.toHaveBeenCalled();
    expect(drawCalls).toEqual([]);
  });
});

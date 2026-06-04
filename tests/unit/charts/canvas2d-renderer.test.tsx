import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas2DBaseRenderer } from '@/charts/renderers/canvas2d-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ResizeCallback = ResizeObserverCallback;

const drawCalls: Array<{ width: number; height: number; pixelRatio: number; fillStyle: string }> = [];
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

function makeContext(): CanvasRenderingContext2D {
  return {
    canvas: document.createElement('canvas'),
    fillStyle: '',
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
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

class StubRenderer extends Canvas2DBaseRenderer {
  draw(
    context: CanvasRenderingContext2D,
    size: { width: number; height: number; pixelRatio: number },
    _data: DataView,
    _config: ChartConfig,
    theme: ThemeTokens,
  ): void {
    context.fillStyle = theme.foreground;
    drawCalls.push({ ...size, fillStyle: String(context.fillStyle) });
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

describe('Canvas2DBaseRenderer', () => {
  let originalResizeObserver: typeof ResizeObserver;
  let context: CanvasRenderingContext2D;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    drawCalls.length = 0;
    disconnect.mockClear();
    resizeCallback = undefined;
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
    context = makeContext();
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context);
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

  it('draws into a scaled canvas with the current data, config, and theme', () => {
    const originalPixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    try {
      const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
      render(<>{element}</>);
      const canvas = screen.getByTestId('canvas2d-chart') as HTMLCanvasElement;
      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(360);
      expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
      expect(context.clearRect).toHaveBeenCalledWith(0, 0, 320, 180);
      expect(drawCalls).toEqual([{ width: 320, height: 180, pixelRatio: 2, fillStyle: '#fff' }]);
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
  });

  it('falls back from parent size to canvas bounds', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLCanvasElement) {
        return {
          width: 240,
          height: 120,
          top: 0,
          right: 240,
          bottom: 120,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
      return {
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(drawCalls.at(-1)).toMatchObject({ width: 240, height: 120 });
  });

  it('falls back from element bounds to canvas client size', () => {
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
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
      configurable: true,
      value: 180,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
      configurable: true,
      value: 90,
    });
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(drawCalls.at(-1)).toMatchObject({ width: 180, height: 90 });
  });

  it('uses fallback dimensions and a minimum pixel ratio when layout has no size', () => {
    const originalPixelRatio = window.devicePixelRatio;
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
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 0 });
    try {
      const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
      render(<>{element}</>);
      expect(drawCalls.at(-1)).toMatchObject({ width: 640, height: 360, pixelRatio: 1 });
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalPixelRatio,
      });
    }
  });

  it('renders an empty state when the renderer reports no drawable data', () => {
    const element = new CustomEmptyRenderer().render(makeDataView(1), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(screen.getByText('Need at least two rows')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas2d-chart')).toBeNull();
  });

  it('uses the default empty-state message for empty row sets', () => {
    const element = new StubRenderer().render(makeDataView(0), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('runs renderer cleanup when the canvas wrapper unmounts', () => {
    const renderer = new DestroyRenderer();
    const element = renderer.render(makeDataView(), makeConfig(), makeTheme());
    const { unmount } = render(<>{element}</>);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(renderer.destroy).toHaveBeenCalledTimes(1);
  });

  it('skips drawing when a 2d context is unavailable', () => {
    getContextSpy.mockReturnValueOnce(null);
    const element = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{element}</>);
    expect(drawCalls).toEqual([]);
  });
});

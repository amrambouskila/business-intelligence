import { useEffect, useRef } from 'react';
import createREGL from 'regl';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 360;

type ReglInstance = ReturnType<typeof createREGL>;

export interface ReglSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export type ReglDraw = (
  regl: ReglInstance,
  size: ReglSize,
  data: DataView,
  config: ChartConfig,
  theme: ThemeTokens,
) => void;

interface ReglChartProps {
  data: DataView;
  config: ChartConfig;
  theme: ThemeTokens;
  draw: ReglDraw;
  onDestroy?: () => void;
}

function measuredCanvasSize(canvas: HTMLCanvasElement): Pick<ReglSize, 'width' | 'height'> {
  const parentRect = canvas.parentElement?.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const width = parentRect?.width || canvasRect.width || canvas.clientWidth || FALLBACK_WIDTH;
  const height = parentRect?.height || canvasRect.height || canvas.clientHeight || FALLBACK_HEIGHT;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function webglContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  return (
    canvas.getContext('webgl')
    ?? canvas.getContext('experimental-webgl')
  ) as WebGLRenderingContext | null;
}

/**
 * regl wrapper that owns one canvas and one regl instance. Chart subclasses
 * provide draw(); this component handles sizing, redraw, and GL cleanup.
 */
export function ReglChart({ data, config, theme, draw, onDestroy }: ReglChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const gl = webglContext(canvas);
    if (!gl) return undefined;

    const regl = createREGL({ canvas, gl });

    const renderCanvas = () => {
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const { width, height } = measuredCanvasSize(canvas);
      const backingWidth = Math.max(1, Math.round(width * pixelRatio));
      const backingHeight = Math.max(1, Math.round(height * pixelRatio));

      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;

      regl.poll();
      draw(regl, { width, height, pixelRatio }, data, config, theme);
    };

    renderCanvas();

    const observer = new ResizeObserver(renderCanvas);
    observer.observe(canvas.parentElement as Element);

    return () => {
      observer.disconnect();
      onDestroy?.();
      regl.destroy();
    };
  }, [config, data, draw, onDestroy, theme]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="regl-chart"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

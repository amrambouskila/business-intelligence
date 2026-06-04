import { useEffect, useRef } from 'react';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 360;

export interface Canvas2DSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export type Canvas2DDraw = (
  context: CanvasRenderingContext2D,
  size: Canvas2DSize,
  data: DataView,
  config: ChartConfig,
  theme: ThemeTokens,
) => void;

interface Canvas2DChartProps {
  data: DataView;
  config: ChartConfig;
  theme: ThemeTokens;
  draw: Canvas2DDraw;
  onDestroy?: () => void;
}

function measuredCanvasSize(canvas: HTMLCanvasElement): Pick<Canvas2DSize, 'width' | 'height'> {
  const parentRect = canvas.parentElement?.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const width = parentRect?.width || canvasRect.width || canvas.clientWidth || FALLBACK_WIDTH;
  const height = parentRect?.height || canvasRect.height || canvas.clientHeight || FALLBACK_HEIGHT;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

/**
 * Canvas2D wrapper that owns one canvas and redraws it on data/config/theme
 * changes and container resize. Chart-specific subclasses only provide draw().
 */
export function Canvas2DChart({ data, config, theme, draw, onDestroy }: Canvas2DChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;

    const renderCanvas = () => {
      const context = canvas.getContext('2d');
      if (!context) return;

      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const { width, height } = measuredCanvasSize(canvas);
      const backingWidth = Math.max(1, Math.round(width * pixelRatio));
      const backingHeight = Math.max(1, Math.round(height * pixelRatio));

      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      draw(context, { width, height, pixelRatio }, data, config, theme);
    };

    renderCanvas();

    const observer = new ResizeObserver(renderCanvas);
    observer.observe(canvas.parentElement as Element);

    return () => {
      observer.disconnect();
      onDestroy?.();
    };
  }, [config, data, draw, onDestroy, theme]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas2d-chart"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

import { useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import type { DeckGLRef } from '@deck.gl/react';
import type { Layer } from '@deck.gl/core';

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

type DeckGLChartProps = {
  layers: Layer[];
  initialViewState: ViewState;
};

/**
 * deck.gl canvas wrapper that finalizes the Deck instance on unmount.
 * Without this, switching chart types or datasets leaks the WebGL context,
 * vertex buffers, textures, and layer GPU state.
 */
export function DeckGLChart({ layers, initialViewState }: DeckGLChartProps) {
  const ref = useRef<DeckGLRef>(null);

  useEffect(() => {
    const current = ref.current;
    return () => {
      current?.deck?.finalize();
    };
  }, []);

  return (
    <DeckGL
      ref={ref}
      initialViewState={initialViewState}
      controller
      layers={layers}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}

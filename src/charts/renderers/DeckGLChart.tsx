import { useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import type { DeckGLRef } from '@deck.gl/react';
import { MapView, OrbitView, OrthographicView } from '@deck.gl/core';
import type {
  Layer,
  MapViewState,
  OrbitViewState,
  OrthographicViewState,
  View,
} from '@deck.gl/core';

export type DeckGLViewKind = 'map' | 'orbit' | 'orthographic';
export type ViewState = MapViewState | OrbitViewState | OrthographicViewState;

type DeckGLChartProps = {
  layers: Layer[];
  viewKind: DeckGLViewKind;
  initialViewState: ViewState;
};

function buildView(viewKind: DeckGLViewKind): View {
  if (viewKind === 'orbit') return new OrbitView();
  if (viewKind === 'orthographic') return new OrthographicView();
  return new MapView({ repeat: false });
}

/**
 * deck.gl canvas wrapper that finalizes the Deck instance on unmount.
 * Without this, switching chart types or datasets leaks the WebGL context,
 * vertex buffers, textures, and layer GPU state.
 */
export function DeckGLChart({ layers, viewKind, initialViewState }: DeckGLChartProps) {
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
      views={buildView(viewKind)}
      initialViewState={initialViewState}
      controller
      layers={layers}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}

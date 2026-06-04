import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import type { DeckGLRef } from '@deck.gl/react';
import { OrbitView, OrthographicView } from '@deck.gl/core';
import type { Layer } from '@deck.gl/core';

const finalize = vi.fn();
const deckProps = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock('@deck.gl/react', () => {
  const MockDeckGL = forwardRef<DeckGLRef, Record<string, unknown>>((props, ref) => {
    deckProps.push(props);
    useImperativeHandle(
      ref,
      () => ({
        deck: { finalize } as unknown as DeckGLRef['deck'],
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

import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class TestRenderer extends DeckGLBaseRenderer {
  buildLayers(): Layer[] {
    return [];
  }
}

class OrbitRenderer extends TestRenderer {
  protected getViewKind() {
    return 'orbit' as const;
  }
}

class OrthographicRenderer extends TestRenderer {
  protected getViewKind() {
    return 'orthographic' as const;
  }
}

function makeConfig(): ChartConfig {
  return { chartType: 'test', columns: {}, options: {} };
}

function makeDataView(): DataView {
  return { sourceId: 's', rows: [], columnArrays: {}, columns: [], rowCount: 0, filters: [] };
}

function makeTheme(): ThemeTokens {
  return {
    mode: 'dark',
    background: '#000',
    foreground: '#fff',
    gridColor: '#333',
    axisColor: '#666',
    colorScale: [],
    sequentialScale: ['#000', '#fff'],
    divergingScale: ['#000', '#888', '#fff'],
    fontFamily: 'sans-serif',
    fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('DeckGLBaseRenderer cleanup', () => {
  it('calls deck.finalize() when the chart unmounts', () => {
    finalize.mockClear();
    const renderer = new TestRenderer();
    const { unmount } = render(<>{renderer.render(makeDataView(), makeConfig(), makeTheme())}</>);
    expect(finalize).not.toHaveBeenCalled();
    unmount();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it('passes orbit and orthographic view instances to DeckGL', () => {
    deckProps.length = 0;
    render(<>{new OrbitRenderer().render(makeDataView(), makeConfig(), makeTheme())}</>);
    render(<>{new OrthographicRenderer().render(makeDataView(), makeConfig(), makeTheme())}</>);
    expect(deckProps.at(-2)!.views).toBeInstanceOf(OrbitView);
    expect(deckProps.at(-1)!.views).toBeInstanceOf(OrthographicView);
  });
});

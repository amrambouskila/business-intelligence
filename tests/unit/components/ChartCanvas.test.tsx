import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartCanvas } from '@/components/chart-area/ChartCanvas';
import { chartRegistry } from '@/charts/registry';
import { darkTokens } from '@/theme/tokens';
import type { ChartDefinition } from '@/charts/types';
import type { DataView } from '@/types/data';

const stub: ChartDefinition = {
  type: '__canvas_stub__',
  family: 'distribution',
  name: 'Canvas Stub',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [],
  createRenderer: () => ({
    render: () => <span data-testid="stub-render">rendered</span>,
  }),
};

function makeDV(): DataView {
  return { sourceId: 's', rows: [], columnArrays: {}, columns: [], rowCount: 0, filters: [] };
}

describe('ChartCanvas', () => {
  it('returns null for an unknown chart type', () => {
    const { container } = render(
      <ChartCanvas
        chartType="__not_registered__"
        data={makeDV()}
        config={{ chartType: '__not_registered__', columns: {}, options: {} }}
        theme={darkTokens}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('delegates to the registered renderer when the type exists', () => {
    if (!chartRegistry.get(stub.type)) chartRegistry.register(stub);
    render(
      <ChartCanvas
        chartType={stub.type}
        data={makeDV()}
        config={{ chartType: stub.type, columns: {}, options: {} }}
        theme={darkTokens}
      />,
    );
    expect(screen.getByTestId('stub-render')).toBeInTheDocument();
  });
});

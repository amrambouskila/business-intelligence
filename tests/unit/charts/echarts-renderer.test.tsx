import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { EChartsOption } from 'echarts';

vi.mock('echarts-for-react', () => {
  const Mock = (props: { option: EChartsOption }) => (
    <div data-testid="mock-echarts" data-bg={String(props.option.backgroundColor ?? '')} />
  );
  return { default: Mock };
});

import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

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

function makeDataView(): DataView {
  return { sourceId: 's', rows: [], columnArrays: {}, columns: [], rowCount: 0, filters: [] };
}

function makeConfig(): ChartConfig {
  return { chartType: 'test', columns: {}, options: {} };
}

class StubRenderer extends EChartsBaseRenderer {
  buildOption(): EChartsOption {
    return { series: [] };
  }
}

class WithTextStyle extends EChartsBaseRenderer {
  buildOption(): EChartsOption {
    return { series: [], textStyle: { color: '#existing' } };
  }
}

describe('EChartsBaseRenderer', () => {
  it('applies transparent background and renders the mock ECharts component', () => {
    const el = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    const { getByTestId } = render(<>{el}</>);
    expect(getByTestId('mock-echarts').dataset.bg).toBe('transparent');
  });

  it('preserves an existing textStyle object while adding color/fontFamily', () => {
    const el = new WithTextStyle().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{el}</>);
  });
});

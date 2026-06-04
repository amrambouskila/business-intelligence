import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EChartsOption } from 'echarts';

vi.mock('echarts-for-react', () => {
  const Mock = (props: { option: EChartsOption }) => {
    const ts = props.option.textStyle as { color?: string; fontFamily?: string } | undefined;
    return (
      <div
        data-testid="mock-echarts"
        data-bg={String(props.option.backgroundColor ?? '')}
        data-color={String(ts?.color ?? '')}
        data-font={String(ts?.fontFamily ?? '')}
        data-animation={String(props.option.animation ?? '')}
      />
    );
  };
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

function makeDataView(rowCount = 1): DataView {
  return { sourceId: 's', rows: [], columnArrays: {}, columns: [], rowCount, filters: [] };
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
    render(<>{el}</>);
    expect(screen.getByTestId('mock-echarts').dataset.bg).toBe('transparent');
  });

  it('merges theme color and fontFamily into an existing textStyle object', () => {
    const el = new WithTextStyle().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{el}</>);
    const node = screen.getByTestId('mock-echarts');
    // theme.foreground overwrites the chart's own textStyle.color; fontFamily is added
    expect(node.dataset.color).toBe('#fff');
    expect(node.dataset.font).toBe('Arial');
  });

  it('renders a themed empty state instead of a chart when the data has no rows', () => {
    const el = new StubRenderer().render(makeDataView(0), makeConfig(), makeTheme());
    render(<>{el}</>);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-echarts')).toBeNull();
  });

  it('leaves ECharts animation untouched when the e2e flag is unset', () => {
    const el = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
    render(<>{el}</>);
    expect(screen.getByTestId('mock-echarts').dataset.animation).toBe('');
  });

  it('disables ECharts animation when window.__E2E__ is set (deterministic screenshots)', () => {
    window.__E2E__ = true;
    try {
      const el = new StubRenderer().render(makeDataView(), makeConfig(), makeTheme());
      render(<>{el}</>);
      expect(screen.getByTestId('mock-echarts').dataset.animation).toBe('false');
    } finally {
      delete window.__E2E__;
    }
  });
});

import type { ReactElement } from 'react';
import type { DataView, DataShape, ColumnType } from '@/types/data';
import type { ChartOptionSpec } from './option-spec';

/** The 13 chart families. */
export type ChartFamily =
  | 'distribution'
  | 'categorical'
  | 'time-series'
  | 'relationships'
  | 'matrix'
  | 'hierarchical'
  | 'network-flow'
  | 'geographic'
  | 'finance'
  | 'statistical'
  | 'composition'
  | 'specialized'
  | '3d';

export const FAMILY_META: Record<ChartFamily, { label: string; icon: string }> = {
  'distribution':  { label: 'Distribution',      icon: 'bar-chart' },
  'categorical':   { label: 'Categorical',       icon: 'bar-chart-2' },
  'time-series':   { label: 'Time Series',       icon: 'trending-up' },
  'relationships': { label: 'Relationships',     icon: 'scatter-chart' },
  'matrix':        { label: 'Matrix / Grid',     icon: 'grid-3x3' },
  'hierarchical':  { label: 'Hierarchical',      icon: 'git-branch' },
  'network-flow':  { label: 'Network / Flow',    icon: 'share-2' },
  'geographic':    { label: 'Geographic',         icon: 'globe' },
  'finance':       { label: 'Finance',           icon: 'candlestick-chart' },
  'statistical':   { label: 'Statistical',       icon: 'activity' },
  'composition':   { label: 'Composition',       icon: 'pie-chart' },
  'specialized':   { label: 'Specialized',       icon: 'settings' },
  '3d':            { label: '3D',                icon: 'box' },
};

/** Which rendering backend a chart uses. */
export type RendererBackend = 'echarts' | 'deckgl' | 'regl' | 'canvas2d';

export interface ColumnRole {
  role: string;
  acceptedTypes: ColumnType[];
  label: string;
  required?: boolean;
}

export interface ChartDefinition {
  type: string;
  family: ChartFamily;
  name: string;
  description: string;
  icon?: string;
  renderer: RendererBackend;
  compatibleShapes: DataShape[];
  requiredColumns: ColumnRole[];
  optionalColumns?: ColumnRole[];
  /** Declarative per-chart option controls; rendered generically by ChartOptionsPanel. */
  options?: ChartOptionSpec[];
  maxRecommendedPoints?: number;
  createRenderer: () => ChartRenderer;
}

export interface ChartConfig {
  chartType: string;
  columns: Record<string, string>;
  options: Record<string, unknown>;
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
    y2?: AxisConfig;
  };
}

export interface AxisConfig {
  label?: string;
  scale?: 'linear' | 'log' | 'time' | 'band';
  min?: number;
  max?: number;
}

export interface ThemeTokens {
  mode: 'dark' | 'light';
  background: string;
  foreground: string;
  gridColor: string;
  axisColor: string;
  colorScale: string[];
  sequentialScale: [string, string];
  divergingScale: [string, string, string];
  fontFamily: string;
  fontSize: { small: number; medium: number; large: number };
}

/** Interface that all chart renderers implement. */
export interface ChartRenderer {
  render(data: DataView, config: ChartConfig, theme: ThemeTokens): ReactElement;
  destroy?(): void;
}

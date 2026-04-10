import type { DataShape } from '@/types/data';
import { chartRegistry } from '@/charts/registry';

/** Given a detected shape, return ranked chart type keys. */
export function suggestCharts(shape: DataShape): string[] {
  const defs = chartRegistry.suggestForShape(shape);
  return defs.map((d) => d.type);
}

/** Hardcoded fallback suggestions when registry is sparse. */
export function defaultSuggestions(shape: DataShape): string[] {
  const map: Record<DataShape, string[]> = {
    single_numeric: ['histogram', 'kde', 'box', 'violin', 'ecdf'],
    category_numeric: ['bar', 'box', 'violin', 'lollipop'],
    time_numeric: ['line', 'area', 'step'],
    time_series_numeric: ['line', 'stacked_area', 'streamgraph'],
    two_numeric: ['scatter', 'regression', 'hexbin'],
    three_numeric: ['bubble', 'scatter_3d'],
    many_numeric: ['correlation_heatmap', 'pairplot', 'parallel_coordinates'],
    matrix: ['heatmap', 'clustermap'],
    hierarchy: ['treemap', 'sunburst', 'icicle'],
    nodes_edges: ['network_graph', 'force_directed'],
    source_target_value: ['sankey', 'chord', 'alluvial'],
    geo_points: ['point_map', 'bubble_map', 'density_map'],
    geo_polygons: ['choropleth'],
    intervals: ['gantt', 'timeline', 'range_bar'],
    ohlcv: ['candlestick', 'ohlc', 'price_volume'],
    survival: ['kaplan_meier', 'cumulative_hazard'],
    event_log: ['funnel', 'cohort_heatmap', 'retention_curve'],
    generic: ['line', 'bar', 'scatter'],
  };
  return map[shape] ?? ['line', 'bar', 'scatter'];
}

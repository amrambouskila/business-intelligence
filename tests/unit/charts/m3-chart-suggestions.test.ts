import { describe, it, expect, beforeAll } from 'vitest';
import { ensureAllFamiliesLoaded } from '@/charts/families';
import { suggestCharts } from '@/data/chart-suggester';
import type { ColumnMeta, ColumnType, DataShape } from '@/types/data';

beforeAll(async () => {
  await ensureAllFamiliesLoaded();
});

function col(name: string, type: ColumnType): ColumnMeta {
  return { name, type, nullable: false, uniqueCount: 3, nullCount: 0 };
}

function suggestedTypes(shape: DataShape, cols: ColumnMeta[]): string[] {
  return suggestCharts(shape, cols).map((d) => d.type);
}

describe('M3 chart suggestions (contract ↔ detector alignment)', () => {
  it('suggests the single-category charts for category_numeric, and withholds the two-category ones', () => {
    const types = suggestedTypes('category_numeric', [col('g', 'category'), col('v', 'integer')]);
    expect(types).toEqual(expect.arrayContaining([
      'bar',
      'horizontal_bar',
      'pie',
      'donut',
      'histogram',
      'cleveland_dot',
      'waffle',
      'rug_plot',
      'strip_plot',
      'dot_plot',
      'violin_plot',
      'ridgeline_plot',
      'beeswarm',
      'joy_plot',
      'pp_plot',
      'probability_plot',
      'cumulative_distribution_plot',
      'stem_and_leaf',
      'raincloud_plot',
      'sina_plot',
      'letter_value_plot',
      'quantile_dot_plot',
      'pictogram',
      'composition_waffle',
    ]));
    // grouped/stacked bar need a second category column to fill the subgroup role
    expect(types).not.toContain('grouped_bar');
    expect(types).not.toContain('stacked_bar');
  });

  it('suggests grouped_bar and stacked_bar once a second category exists', () => {
    const types = suggestedTypes('category_numeric', [col('region', 'category'), col('quarter', 'category'), col('sales', 'integer')]);
    expect(types).toEqual(expect.arrayContaining([
      'grouped_bar',
      'stacked_bar',
      'composition_stacked_bar',
      'composition_percent_stacked_bar',
      'mosaic_plot',
      'spine_plot',
    ]));
  });

  it('suggests marimekko once two categories and two numeric metrics exist', () => {
    const types = suggestedTypes('category_numeric', [
      col('region', 'category'),
      col('quarter', 'category'),
      col('sales', 'integer'),
      col('profit', 'float'),
    ]);
    expect(types).toContain('marimekko');
  });

  it('suggests bubble and ternary for three_numeric but not for two_numeric', () => {
    const threeNumericTypes = suggestedTypes('three_numeric', [col('x', 'integer'), col('y', 'integer'), col('z', 'integer')]);
    expect(threeNumericTypes).toEqual(expect.arrayContaining(['bubble', 'ternary']));
    expect(suggestedTypes('two_numeric', [col('x', 'integer'), col('y', 'integer')])).not.toContain('bubble');
    expect(suggestedTypes('three_numeric', [col('price', 'float'), col('bid_size', 'integer'), col('ask_size', 'integer')])).toContain('order_book_depth_chart');
  });

  it('suggests heatmap-style grid charts for the matrix shape', () => {
    expect(suggestedTypes('matrix', [col('row', 'category'), col('col', 'category'), col('value', 'integer')])).toEqual(expect.arrayContaining([
      'heatmap',
      'annotated_heatmap',
      'clustermap',
      'confusion_matrix',
      'correlation_matrix',
      'distance_matrix_heatmap',
      'image_raster_plot',
      'tile_map',
      'quilt_plot',
    ]));
  });

  it('suggests line, area, step, multi_line, stacked_area, percent_stacked_area, sparkline, horizon, seasonal, lag, acf, and pacf for time_series_numeric', () => {
    const types = suggestedTypes('time_series_numeric', [col('date', 'datetime'), col('region', 'category'), col('value', 'integer')]);
    expect(types).toEqual(expect.arrayContaining([
      'line',
      'area',
      'step',
      'multi_line',
      'stacked_area',
      'percent_stacked_area',
      'sparkline',
      'horizon_chart',
      'seasonal_subseries_plot',
      'lag_plot',
      'autocorrelation_plot',
      'partial_autocorrelation_plot',
    ]));
  });

  it('suggests the single-numeric distribution charts for single_numeric', () => {
    const types = suggestedTypes('single_numeric', [col('v', 'float')]);
    expect(types).toEqual(expect.arrayContaining(['box_plot', 'ecdf', 'kde', 'rug_plot', 'dot_plot', 'violin_plot', 'stem_and_leaf', 'quantile_dot_plot']));
  });

  it('suggests candlestick and volume for the ohlcv shape', () => {
    const types = suggestedTypes('ohlcv', [
      col('date', 'datetime'), col('open', 'float'), col('high', 'float'),
      col('low', 'float'), col('close', 'float'), col('volume', 'integer'), col('rolling_vol', 'float'),
    ]);
    expect(types).toEqual(expect.arrayContaining([
      'candlestick',
      'volume',
      'rolling_volatility_plot',
      'renko',
      'kagi',
      'point_and_figure',
    ]));
  });

  it('suggests funnel and lollipop for category_numeric', () => {
    const types = suggestedTypes('category_numeric', [col('stage', 'category'), col('v', 'integer')]);
    expect(types).toEqual(expect.arrayContaining(['funnel', 'lollipop']));
  });

  it('suggests sankey for the source_target_value shape', () => {
    const types = suggestedTypes('source_target_value', [col('src', 'category'), col('dst', 'category'), col('amt', 'integer')]);
    expect(types).toEqual(expect.arrayContaining(['sankey', 'arc_diagram', 'chord_diagram', 'network_graph', 'dependency_graph', 'adjacency_matrix']));
  });

  it('suggests alluvial, waterfall, and nested donut when multi-category roles are fillable', () => {
    const types = suggestedTypes('category_numeric', [
      col('stage1', 'category'),
      col('stage2', 'category'),
      col('stage3', 'category'),
      col('value', 'integer'),
    ]);
    expect(types).toEqual(expect.arrayContaining(['alluvial_diagram', 'waterfall_chart', 'nested_donut']));
  });

  it('suggests treemap, sunburst, and partition-style charts for the hierarchy shape', () => {
    const types = suggestedTypes('hierarchy', [col('id', 'category'), col('parent', 'category'), col('val', 'integer')]);
    expect(types).toEqual(expect.arrayContaining(['treemap', 'sunburst', 'icicle', 'circle_packing', 'partition_chart']));
  });

  // --- wave 3 ---

  it('suggests qq_plot, frequency_polygon, and gauge for single_numeric', () => {
    const types = suggestedTypes('single_numeric', [col('v', 'float')]);
    expect(types).toEqual(expect.arrayContaining(['qq_plot', 'frequency_polygon', 'pp_plot', 'probability_plot', 'cumulative_distribution_plot', 'gauge']));
  });

  it('suggests error_bar, feature_importance, and pareto for a category + numeric dataset', () => {
    const types = suggestedTypes('category_numeric', [col('label', 'category'), col('est', 'float'), col('lo', 'float'), col('hi', 'float')]);
    expect(types).toEqual(expect.arrayContaining(['error_bar', 'feature_importance', 'pareto', 'forest_plot', 'mean_ci_band']));
  });

  it('suggests KPI and bullet charts when their specialized roles are fillable', () => {
    const types = suggestedTypes('category_numeric', [
      col('metric_name', 'category'),
      col('value', 'float'),
      col('label', 'category'),
      col('actual', 'float'),
      col('target', 'float'),
      col('range1', 'float'),
      col('range2', 'float'),
      col('range3', 'float'),
    ]);
    expect(types).toEqual(expect.arrayContaining(['kpi_card', 'bullet_chart']));
  });

  it('suggests funnel area and pyramid charts when their roles are fillable', () => {
    const funnelTypes = suggestedTypes('category_numeric', [col('stage', 'category'), col('value', 'integer')]);
    expect(funnelTypes).toContain('funnel_area');

    const pyramidTypes = suggestedTypes('category_numeric', [
      col('category', 'category'),
      col('left_value', 'integer'),
      col('right_value', 'integer'),
    ]);
    expect(pyramidTypes).toContain('pyramid_chart');

    const populationTypes = suggestedTypes('category_numeric', [
      col('age_band', 'category'),
      col('sex', 'category'),
      col('count', 'integer'),
    ]);
    expect(populationTypes).toContain('population_pyramid');
  });

  it('suggests specialized analytics charts when their roles are fillable', () => {
    expect(suggestedTypes('category_numeric', [
      col('region', 'category'),
      col('quarter', 'category'),
      col('sales', 'integer'),
    ])).toEqual(expect.arrayContaining(['table', 'small_multiples', 'faceted_dashboard_grid']));

    expect(suggestedTypes('category_numeric', [
      col('topic', 'category'),
      col('term', 'category'),
      col('word', 'category'),
      col('weight', 'float'),
    ])).toEqual(expect.arrayContaining(['topic_term_bubble', 'word_cloud']));

    expect(suggestedTypes('category_numeric', [
      col('order', 'integer'),
      col('actor', 'category'),
      col('action', 'category'),
      col('target_actor', 'category'),
    ])).toContain('sequence_diagram');

    const cohortTypes = suggestedTypes('category_numeric', [
      col('cohort', 'category'),
      col('period', 'integer'),
      col('retention', 'float'),
    ]);
    expect(cohortTypes).toEqual(expect.arrayContaining(['cohort_retention_heatmap', 'retention_curve']));

    expect(suggestedTypes('source_target_value', [
      col('source', 'category'),
      col('target', 'category'),
      col('count', 'integer'),
    ])).toContain('conversion_path_chart');

    expect(suggestedTypes('time_series_numeric', [
      col('date', 'datetime'),
      col('entity', 'category'),
      col('rank', 'integer'),
    ])).toEqual(expect.arrayContaining(['bump_chart', 'ranking_table_with_sparklines']));
  });

  it('suggests finance and survival analytics charts when their roles are fillable', () => {
    expect(suggestedTypes('two_numeric', [
      col('maturity', 'float'),
      col('yield', 'float'),
    ])).toContain('yield_curve');

    expect(suggestedTypes('category_numeric', [
      col('weekday', 'category'),
      col('hour', 'integer'),
      col('value', 'float'),
    ])).toContain('candlestick_heatmap_by_hour_day');

    const survivalTypes = suggestedTypes('category_numeric', [
      col('time', 'integer'),
      col('event', 'integer'),
      col('group', 'category'),
    ]);
    expect(survivalTypes).toEqual(expect.arrayContaining(['survival_curve', 'cumulative_hazard_plot']));
  });

  it('suggests model-explainability charts when their roles are fillable', () => {
    const explainabilityTypes = suggestedTypes('category_numeric', [
      col('entity', 'category'),
      col('feature', 'category'),
      col('feature_value', 'float'),
      col('shap_value', 'float'),
      col('predicted', 'float'),
    ]);
    expect(explainabilityTypes).toEqual(expect.arrayContaining([
      'shap_summary_beeswarm',
      'shap_dependence_plot',
      'partial_dependence_plot',
      'ice_plot',
    ]));
  });

  it('suggests percent_stacked_bar once a second category exists', () => {
    const types = suggestedTypes('category_numeric', [col('region', 'category'), col('quarter', 'category'), col('sales', 'integer')]);
    expect(types).toContain('percent_stacked_bar');
    expect(types).toContain('composition_percent_stacked_bar');
  });

  it('suggests dumbbell and slope once a category plus two numeric values exist', () => {
    const types = suggestedTypes('category_numeric', [col('region', 'category'), col('sales', 'integer'), col('profit', 'float')]);
    expect(types).toEqual(expect.arrayContaining(['dumbbell', 'slope', 'colored_scatter']));
  });

  it('suggests the regression / classifier-eval charts for two_numeric', () => {
    const types = suggestedTypes('two_numeric', [col('x', 'float'), col('y', 'integer')]);
    expect(types).toEqual(expect.arrayContaining([
      'residual_plot',
      'actual_vs_predicted',
      'roc_curve',
      'pr_curve',
      'calibration_curve',
      'bland_altman',
      'lift_chart',
      'gain_chart',
      'regression_plot',
      'loess_smoother_plot',
      'joint_plot',
      'hexbin_plot',
      'two_d_density_plot',
      't_sne_plot',
      'umap_plot',
      'polar_scatter',
      'polar_line',
    ]));
  });

  it('suggests contour-style relationship charts when x/y/z roles are fillable', () => {
    const types = suggestedTypes('three_numeric', [col('x', 'float'), col('y', 'float'), col('z', 'float')]);
    expect(types).toEqual(expect.arrayContaining(['contour_plot', 'filled_contour', 'hexbin_plot', 'two_d_density_plot', 'joint_plot']));
  });

  it('suggests multivariate relationship charts when feature roles are fillable', () => {
    const types = suggestedTypes('many_numeric', [
      col('f1', 'float'),
      col('f2', 'float'),
      col('f3', 'float'),
      col('pc1', 'float'),
      col('pc2', 'float'),
      col('loading_x', 'float'),
      col('loading_y', 'float'),
    ]);
    expect(types).toEqual(expect.arrayContaining([
      'andrews_curves',
      'biplot',
      'correlation_heatmap',
      'covariance_heatmap',
      'parallel_coordinates',
      'pair_plot',
      'radviz',
      'scatter_matrix',
    ]));
  });

  it('suggests faceted scatter, radar, and PCA-style embedding charts when roles are fillable', () => {
    const facetedTypes = suggestedTypes('category_numeric', [
      col('x', 'float'),
      col('y', 'float'),
      col('facet', 'category'),
    ]);
    expect(facetedTypes).toEqual(expect.arrayContaining(['faceted_scatter', 'radar']));

    const pcaTypes = suggestedTypes('many_numeric', [
      col('pc1', 'float'),
      col('pc2', 'float'),
      col('x', 'float'),
      col('y', 'float'),
      col('z', 'float'),
    ]);
    expect(pcaTypes).toContain('pca_scatter');
  });

  it('suggests calendar_heatmap for time_numeric and streamgraph for time_series_numeric', () => {
    expect(suggestedTypes('time_numeric', [col('date', 'datetime'), col('v', 'integer')])).toEqual(expect.arrayContaining([
      'calendar_heatmap',
      'sparkline',
      'horizon_chart',
      'seasonal_subseries_plot',
      'lag_plot',
      'autocorrelation_plot',
      'partial_autocorrelation_plot',
      'run_chart',
    ]));
    expect(suggestedTypes('time_series_numeric', [col('date', 'datetime'), col('s', 'category'), col('v', 'integer')])).toContain('streamgraph');
    expect(suggestedTypes('time_series_numeric', [col('date', 'datetime'), col('subgroup', 'category'), col('value', 'integer')])).toEqual(expect.arrayContaining([
      'composition_stacked_area',
      'composition_percent_stacked_area',
    ]));
  });

  it('suggests event and interval timeline charts for interval datasets', () => {
    const types = suggestedTypes('intervals', [
      col('task', 'category'),
      col('lane', 'category'),
      col('start', 'datetime'),
      col('end', 'datetime'),
      col('date', 'datetime'),
      col('label', 'category'),
    ]);
    expect(types).toEqual(expect.arrayContaining([
      'event_timeline',
      'gantt_chart',
      'swimlane_timeline',
      'range_bar',
    ]));
  });

  it('suggests control_chart and fan_chart when their numeric roles are fillable', () => {
    const controlTypes = suggestedTypes('time_numeric', [
      col('date', 'datetime'), col('value', 'float'), col('ucl', 'float'), col('lcl', 'float'),
    ]);
    expect(controlTypes).toContain('control_chart');

    const fanTypes = suggestedTypes('time_numeric', [
      col('date', 'datetime'), col('p10', 'float'), col('p25', 'float'), col('p50', 'float'), col('p75', 'float'), col('p90', 'float'),
    ]);
    expect(fanTypes).toContain('fan_chart');

    const coneTypes = suggestedTypes('time_numeric', [
      col('date', 'datetime'), col('center', 'float'), col('lower', 'float'), col('upper', 'float'),
    ]);
    expect(coneTypes).toContain('forecast_cone');
  });

  it('suggests annotated_heatmap (matrix), tree (hierarchy), force_directed_graph (source_target_value), and ohlc (ohlcv)', () => {
    expect(suggestedTypes('matrix', [col('row', 'category'), col('col', 'category'), col('value', 'integer')])).toContain('annotated_heatmap');
    expect(suggestedTypes('time_numeric', [col('date', 'datetime'), col('value', 'integer')])).toContain('calendar_matrix');
    expect(suggestedTypes('hierarchy', [col('id', 'category'), col('parent', 'category')])).toEqual(expect.arrayContaining([
      'tree',
      'radial_tree',
      'dendrogram',
    ]));
    expect(suggestedTypes('source_target_value', [col('source', 'category'), col('target', 'category'), col('amt', 'integer')])).toContain('force_directed_graph');
    expect(suggestedTypes('ohlcv', [
      col('date', 'datetime'), col('open', 'float'), col('high', 'float'), col('low', 'float'), col('close', 'float'),
    ])).toContain('ohlc');
  });
});

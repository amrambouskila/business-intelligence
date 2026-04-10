# Supported Charts & Data Types

This document defines all chart types and data shapes the Business Intelligence viewer aims to support. Each entry specifies the chart family, required dataset structure, and minimum columns needed.

---

## Chart Catalog

### Distribution

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Histogram | `value` | Raw observations |
| Density plot / KDE | `value` | Raw observations |
| ECDF | `value` | Raw observations |
| Rug plot | `value` | Raw observations |
| Box plot | `value` or `group, value` | Raw observations |
| Violin plot | `value` or `group, value` | Raw observations |
| Strip plot | `group, value` | Raw observations |
| Beeswarm / swarm | `group, value` | Raw observations |
| Dot plot | `group, value` or `value` | Raw or aggregated values |
| Ridgeline plot | `group, value` | Raw observations grouped by category/time bucket |
| Joy plot | `group, value` | Same as ridgeline |
| QQ plot | `value` or `x, y` | Raw observations |
| PP plot | `value` or `x, y` | Raw observations |
| Probability plot | `value` | Raw observations |
| Stem-and-leaf | `value` | Small raw datasets |
| Frequency polygon | `value` | Raw observations or binned counts |
| Cumulative distribution plot | `value` | Raw observations |
| Raincloud plot | `group, value` | Raw observations |
| Sina plot | `group, value` | Raw observations |
| Letter-value plot | `group, value` | Large raw datasets |
| Quantile dot plot | `value` or `group, value` | Raw observations |

### Categorical Comparison

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Bar chart | `category, value` | Aggregated summary or precomputed measure |
| Horizontal bar chart | `category, value` | Aggregated summary |
| Grouped bar chart | `category, subgroup, value` | Aggregated summary |
| Stacked bar chart | `category, subgroup, value` | Aggregated summary |
| 100% stacked bar | `category, subgroup, value` | Aggregated proportions |
| Lollipop chart | `category, value` | Aggregated summary |
| Cleveland dot plot | `category, value` | Aggregated summary |
| Dumbbell chart | `category, value_a, value_b` | Aggregated comparison pairs |
| Slope chart | `label, start_value, end_value` or `label, time, value` | Paired comparisons |
| Pareto chart | `category, value` | Aggregated counts sorted descending |
| Mosaic plot | `cat_a, cat_b, count` | Contingency table |
| Marimekko / Mekko | `category, subgroup, value, width_metric` | Aggregated market-share style data |
| Waffle chart | `category, value` | Aggregated proportions |
| Pictogram chart | `category, value` | Aggregated proportions |
| Spine plot | `cat_a, cat_b, count` | Contingency table |

### Time Series

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Line chart | `date, value` | Ordered time series |
| Multi-line chart | `date, series, value` | Long-form multi-series time data |
| Area chart | `date, value` | Ordered time series |
| Stacked area chart | `date, series, value` | Long-form multi-series time data |
| 100% stacked area | `date, series, value` | Proportional time series |
| Step chart | `date, value` | Discrete state changes over time |
| Sparkline | `date, value` | Compact time series |
| Horizon chart | `date, value` | Dense long time series |
| Streamgraph | `date, series, value` | Multi-series flowing totals |
| Calendar heatmap | `date, value` | Daily time series |
| Seasonal subseries plot | `date, value` or `year, month, value` | Time series with seasonality |
| Lag plot | `value` | Ordered series with lag relationship |
| Autocorrelation plot | `value` | Ordered time series |
| Partial autocorrelation plot | `value` | Ordered time series |
| Run chart | `date, value` | Process monitoring |
| Control chart | `date, value, ucl, lcl` | Quality/process control |
| Fan chart | `date, p10, p25, p50, p75, p90` | Forecast outputs |
| Forecast cone | `date, center, lower, upper` | Forecast outputs |
| Event timeline | `date, label` | Event logs |
| Gantt chart | `task, start, end` | Project/task schedules |
| Swimlane timeline | `lane, task, start, end` | Multi-owner/project schedules |
| Range bar / interval bar | `label, start, end` | Interval data |

### Relationships

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Scatter plot | `x, y` | Raw observations |
| Bubble chart | `x, y, size` | Raw observations |
| Colored scatter | `x, y, color_group` | Raw observations |
| Faceted scatter | `x, y, facet` | Raw observations |
| Regression plot | `x, y` | Raw observations |
| LOESS smoother plot | `x, y` | Raw observations |
| Joint plot | `x, y` | Raw observations |
| Hexbin plot | `x, y` | Large raw point clouds |
| 2D density plot | `x, y` | Large raw point clouds |
| Contour plot | `x, y, z` or dense `x, y` | Gridded surface or estimated density |
| Filled contour | `x, y, z` | Matrix/grid data |
| Scatter matrix / pair plot | `f1, f2, f3...` | Wide multivariate table |
| Correlation heatmap | `f1, f2, f3...` | Wide multivariate table (correlation matrix) |
| Covariance heatmap | `f1, f2, f3...` | Wide multivariate table (covariance matrix) |
| Parallel coordinates | `f1, f2, f3...` optionally `class` | Wide multivariate table |
| Radar / spider chart | `metric, value` or one row with many metric columns | Aggregated summary per entity |
| Polar scatter | `theta, r` | Polar/rotational data |
| Polar line | `theta, r` | Circular or directional series |
| Ternary plot | `a, b, c` | Compositional data |
| Biplot | `pc1, pc2` and loadings | Dimensionality reduction output |
| PCA scatter | `pc1, pc2` optionally `class` | PCA result |
| t-SNE plot | `x, y` optionally `class` | t-SNE result |
| UMAP plot | `x, y` optionally `class` | UMAP result |
| Andrews curves | `f1, f2, f3...` | Wide multivariate table |
| RadViz | `f1, f2, f3...` | Wide multivariate table |

### Matrix / Grid

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Heatmap | `row, col, value` | Pivoted matrix/grid |
| Annotated heatmap | `row, col, value` | Pivoted matrix/grid |
| Clustermap | `row, col, value` or dense matrix | Matrix data |
| Confusion matrix | `actual, predicted, count` or square matrix | Classification results |
| Correlation matrix | square matrix | Derived from numeric feature table |
| Distance matrix heatmap | square matrix | Derived distance matrix |
| Calendar matrix | `date, value` | Daily time series |
| Image / raster plot | `row, col, intensity` or 2D array | Pixel/raster data |
| Tile map | `row, col, value` | Any gridded table |
| Quilt plot | `row, col, value` | Gridded/categorical matrix |

### Hierarchical

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Treemap | `id, parent, value` | Hierarchical tree data |
| Sunburst | `id, parent, value` | Hierarchical tree data |
| Icicle chart | `id, parent, value` | Hierarchical tree data |
| Dendrogram | linkage/tree structure | Cluster hierarchy |
| Node-link tree | `id, parent` | Tree data |
| Radial tree | `id, parent` | Tree data |
| Circle packing | `id, parent, value` | Hierarchical tree data |
| Partition chart | `id, parent, value` | Hierarchical tree data |

### Network / Flow

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Network graph | node table + edge table | Graph data |
| Force-directed graph | node table + edge table | Graph data |
| Arc diagram | node table + edge table | Graph data with order |
| Chord diagram | `source, target, value` or matrix | Inter-category flows |
| Sankey diagram | `source, target, value` | Flow/stage transition data |
| Alluvial diagram | `stage1, stage2, stage3..., value` | Multi-step categorical flow |
| Funnel chart | `stage, value` | Funnel progression summaries |
| Waterfall chart | `step, delta` or `step, start, end` | Sequential contributions |
| Dependency graph | node table + edge table | Software/task dependency data |
| Adjacency matrix | square matrix | Graph data transformed into matrix |

### Geographic

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Point map | `lat, lon` | Geospatial point data |
| Bubble map | `lat, lon, value` | Geospatial point data |
| Symbol map | `lat, lon, category` | Geospatial point data |
| Choropleth map | `region/geometry, value` | Polygon geography data |
| Filled map | `geometry, value` | Polygon geography data |
| Density map | `lat, lon` | Large point clouds |
| Hexbin map | `lat, lon` optionally `value` | Large point clouds |
| Geospatial heatmap | `lat, lon, value` | Point data |
| Cartogram | `geometry, value` | Polygon geography data |
| Flow map | `origin_lat, origin_lon, dest_lat, dest_lon, value` | Route or traffic flow data |
| Route map | `lat, lon, order` | Sequential movement data |
| Isochrone / contour map | `geometry, time/value` | Travel-time or gridded geo data |
| Voronoi map | `lat, lon` | Spatial partitioning data |
| Tile grid / grid map | `region, value` | Predefined tile-grid geography |

### Finance

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Candlestick | `date, open, high, low, close` | Financial OHLC data |
| OHLC chart | `date, open, high, low, close` | Financial OHLC data |
| Heikin-Ashi | `date, open, high, low, close` | Financial OHLC data after transformation |
| Renko | `date, close` or OHLC | Financial price data |
| Kagi | `date, close` | Financial price data |
| Point-and-figure | `date, close` | Financial price data |
| Volume bars | `date, volume` | Financial volume series |
| Price + volume dashboard | `date, open, high, low, close, volume` | Financial OHLCV data |
| Drawdown chart | `date, equity` | Portfolio or asset equity curve |
| Return series line | `date, return` | Derived returns |
| Rolling volatility plot | `date, rolling_vol` | Derived financial stats |
| Equity curve | `date, equity` | Backtest/live trading output |
| Order book depth chart | `price, bid_size, ask_size` | Market microstructure data |
| Yield curve | `maturity, yield` | Fixed income term structure |
| Candlestick heatmap by hour/day | `weekday, hour, value` | Time-bucketed trading data |

### Statistical / Model Evaluation

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Error bar chart | `category, estimate, lower, upper` | Aggregated summary stats |
| Mean with confidence band | `x, mean, lower, upper` | Model/statistical summaries |
| Forest plot | `label, estimate, lower, upper` | Statistical comparisons |
| Bland-Altman plot | `measure_a, measure_b` | Paired measurement studies |
| Residual plot | `predicted, residual` | Regression results |
| Actual vs predicted scatter | `actual, predicted` | Regression results |
| Calibration curve | `pred_bin, observed_rate` | Classification calibration output |
| ROC curve | `fpr, tpr` | Binary classifier evaluation |
| Precision-recall curve | `recall, precision` | Binary classifier evaluation |
| Lift chart | `x, lift` | Marketing/classification evaluation |
| Gain chart | `x, gain` | Marketing/classification evaluation |
| Confusion matrix chart | `actual, predicted, count` | Classification results |
| Feature importance bar chart | `feature, importance` | Model output |
| SHAP summary beeswarm | long SHAP table | Explainability output |
| SHAP dependence plot | `feature_value, shap_value` | Explainability output |
| Partial dependence plot | `feature_value, predicted` | Model sensitivity output |
| ICE plot | `entity, feature_value, predicted` | Model sensitivity output |
| Survival curve / Kaplan-Meier | `time, event` optionally `group` | Survival analysis data |
| Cumulative hazard plot | `time, event` | Survival analysis data |

### Composition

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Pie chart | `category, value` | Aggregated proportions |
| Donut chart | `category, value` | Aggregated proportions |
| Nested donut | `level1, level2, value` | Hierarchical proportions |
| Stacked bar | `category, subgroup, value` | Aggregated composition |
| Stacked area | `date, subgroup, value` | Time-varying composition |
| 100% stacked bar | `category, subgroup, value` | Proportions |
| 100% stacked area | `date, subgroup, value` | Time-varying proportions |
| Treemap | `id, parent, value` | Hierarchical composition |
| Sunburst | `id, parent, value` | Hierarchical composition |
| Waffle chart | `category, value` | Aggregated proportions |

### Specialized

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| Table | any columns | Raw or summarized data |
| KPI card / stat card | `metric_name, value` | Aggregated summary |
| Bullet chart | `label, actual, target, range1, range2, range3` | KPI/performance summary |
| Gauge chart | `value` optionally `target` | KPI snapshot |
| Funnel area chart | `stage, value` | Funnel summaries |
| Pyramid chart | `category, left_value, right_value` | Population/segmented comparison |
| Population pyramid | `age_band, sex, count` | Demographic data |
| Word cloud | `word, weight` | Text frequency summary |
| Topic-term bubble | `topic, term, weight` | NLP topic model output |
| Sequence diagram | `time/order, actor, action, target_actor` | Event/interaction logs |
| Cohort retention heatmap | `cohort, period, retention` | User/product analytics |
| Retention curve | `period, retention` | Cohort analysis |
| Conversion path chart | `path, count` or stage transitions | Web/product event logs |
| Bump chart | `date, entity, rank` | Ranked time-series data |
| Ranking table with sparklines | `entity, rank` + small time series | Leaderboards |
| Small multiples | base chart columns + `facet` | Any facetable long-form data |
| Faceted dashboard grid | base chart columns + `facet` | Any subgrouped data |

### 3D

| Chart | Minimum columns / structure | Best generated from |
|---|---|---|
| 3D scatter | `x, y, z` | Raw observations |
| 3D surface | `x, y, z` | Gridded surface data |
| 3D wireframe | `x, y, z` | Gridded surface data |
| 3D contour | `x, y, z` | Gridded surface data |
| 3D bar chart | `x, y, z` | Aggregated matrix-like data |
| 3D volume rendering | `x, y, z, value` | Scientific imaging/grid data |

---

## Dataset Shape Detection

The app should auto-detect the uploaded data shape and suggest appropriate chart types:

| Detected shape | Auto-suggest charts |
|---|---|
| 1 numeric column | histogram, KDE, box, violin, ECDF |
| 1 datetime + 1 numeric | line, area, step |
| 1 category + 1 numeric | bar, box, lollipop, dot |
| 2 numerics | scatter, regression, hexbin |
| many numerics | correlation heatmap, pair plot, PCA/UMAP |
| matrix | heatmap, annotated heatmap, clustermap |
| hierarchy | treemap, sunburst |
| nodes + edges | network, sankey, chord |
| geo points | point map, bubble map, density map |
| geo polygons | choropleth |
| OHLCV | candlestick, OHLC, volume |
| intervals | Gantt, timeline |
| event log | funnel, retention, cohort heatmap |

## Dataset Shape Quick Reference

| Dataset shape | Example columns | Common charts |
|---|---|---|
| Single numeric series | `value` | histogram, KDE, ECDF, box, violin, QQ |
| Category + numeric | `group, value` | bar, box, violin, strip, lollipop |
| Time + numeric | `date, value` | line, area, sparkline, control chart |
| Time + series + numeric | `date, series, value` | multi-line, stacked area, streamgraph |
| Two numeric | `x, y` | scatter, regression, hexbin, density |
| Three numeric | `x, y, z` | bubble, 3D scatter, surface |
| Many numeric columns | `f1, f2, f3...` | correlation heatmap, pair plot, parallel coordinates |
| Matrix / pivot | `row, col, value` | heatmap, confusion matrix, clustermap |
| Hierarchy | `id, parent, value` | treemap, sunburst, icicle |
| Nodes + edges | node table + edge table | network, force graph, arc diagram |
| Source-target-value | `source, target, value` | sankey, chord, alluvial, funnel-like flow |
| Geo points | `lat, lon, value/category` | point map, bubble map, density map |
| Geo polygons | `geometry/region, value` | choropleth, cartogram |
| Start/end intervals | `task, start, end` | Gantt, swimlane, range bar |
| OHLCV | `date, open, high, low, close, volume` | candlestick, OHLC, price-volume dashboard |
| Survival data | `time, event, group` | Kaplan-Meier, cumulative hazard |
| Event log | `user, event, timestamp` | funnels, cohorts, retention, timelines |
import type { DataSet } from '@/types/data';
import { analyzeColumns, detectShape } from './shape-detector';

/**
 * Deterministic mulberry32 PRNG. Sample data is generated from a fixed seed so the
 * same dataset loads every time — required for stable visual-regression baselines
 * (and reproducible demos), since random data would re-baseline on every run.
 */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via Box-Muller from a uniform PRNG. */
function gaussian(rng: () => number): number {
  // 1 - rng() lands in (0,1] (rng() is [0,1)), so Math.log is always finite — no guard branch.
  const u1 = 1 - rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** OHLCV + categorical fields — financial data (shape: ohlcv). */
function generateStockData(): Record<string, unknown>[] {
  const rng = makeRng(1);
  const rows: Record<string, unknown>[] = [];
  const returns: number[] = [];
  let price = 150;
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer'];
  const ratings = ['Buy', 'Hold', 'Sell'];
  const start = new Date('2024-01-02');

  for (let i = 0; i < 252; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (rng() - 0.48) * 4;
    const open = price + (rng() - 0.5);
    const close = open + change;
    const high = Math.max(open, close) + rng() * 2;
    const low = Math.min(open, close) - rng() * 2;
    const volume = Math.floor(1_000_000 + rng() * 7_000_000);
    const dailyReturn = +((change / open) * 100).toFixed(4);
    returns.push(dailyReturn);
    const recentReturns = returns.slice(Math.max(0, returns.length - 20));
    const meanReturn = recentReturns.reduce((sum, value) => sum + value, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) / recentReturns.length;
    price = close;

    rows.push({
      Date: date.toISOString().split('T')[0],
      Open: +open.toFixed(2),
      High: +high.toFixed(2),
      Low: +low.toFixed(2),
      Close: +close.toFixed(2),
      Volume: volume,
      Daily_Return: dailyReturn,
      rolling_vol: +(Math.sqrt(variance) * Math.sqrt(252)).toFixed(2),
      Sector: sectors[Math.floor(rng() * sectors.length)],
      Rating: ratings[Math.floor(rng() * ratings.length)],
    });
  }
  return rows;
}

/** Two correlated numerics + a third + a group — distributions/scatter (shape: category_numeric). */
function generateNumericData(): Record<string, unknown>[] {
  const rng = makeRng(2);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 400; i++) {
    const n1 = gaussian(rng);
    const n2 = gaussian(rng);
    rows.push({
      x: +(n1 * 10 + 50).toFixed(2),
      y: +(n1 * 5 + n2 * 3 + 30).toFixed(2),
      z: +(rng() * 100).toFixed(2),
      group: ['A', 'B', 'C', 'D'][Math.floor(rng() * 4)],
      value: +Math.exp(n1 * 0.4 + 4).toFixed(2),
    });
  }
  return rows;
}

/** Region × Quarter sales — categorical comparison/composition (shape: category_numeric, two categories). */
function generateSalesData(): Record<string, unknown>[] {
  const rng = makeRng(3);
  const regions = ['North', 'South', 'East', 'West'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const rows: Record<string, unknown>[] = [];
  for (const region of regions) {
    const base = 20 + rng() * 60;
    for (const quarter of quarters) {
      const sales = +(base + rng() * 40).toFixed(1);
      rows.push({ region, quarter, sales, profit: +(sales * (0.1 + rng() * 0.2)).toFixed(1) });
    }
  }
  return rows;
}

/** Binary-classifier scores + labels (positives skewed higher) — ROC/PR/calibration (shape: category_numeric). */
function generateClassificationData(): Record<string, unknown>[] {
  const rng = makeRng(4);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 200; i++) {
    const label = rng() < 0.4 ? 1 : 0;
    // Positives drawn higher than negatives so the curve is informative, not diagonal.
    const raw = (label === 1 ? 0.55 : 0.25) + gaussian(rng) * 0.18;
    const score = +Math.min(0.999, Math.max(0.001, raw)).toFixed(4);
    rows.push({ score, label, model: label === 1 ? 'positive' : 'negative' });
  }
  return rows;
}

/** Regression actual/predicted/residual — residual & actual-vs-predicted plots (shape: three_numeric). */
function generateRegressionData(): Record<string, unknown>[] {
  const rng = makeRng(5);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 200; i++) {
    const actual = +(rng() * 100).toFixed(2);
    const predicted = +(actual + gaussian(rng) * 8).toFixed(2);
    rows.push({ actual, predicted, residual: +(predicted - actual).toFixed(2) });
  }
  return rows;
}

/** Per-metric estimates with confidence bounds — error-bar/forest (shape: category_numeric). */
function generateEstimatesData(): Record<string, unknown>[] {
  const rng = makeRng(6);
  const metrics = ['Accuracy', 'Precision', 'Recall', 'F1', 'AUC', 'Specificity'];
  return metrics.map((metric) => {
    const estimate = +(0.6 + rng() * 0.3).toFixed(3);
    const half = +(0.02 + rng() * 0.06).toFixed(3);
    return { metric, estimate, lower: +(estimate - half).toFixed(3), upper: +(estimate + half).toFixed(3) };
  });
}

/** Model feature importances — feature-importance bar (shape: category_numeric). */
function generateFeaturesData(): Record<string, unknown>[] {
  const rng = makeRng(7);
  const features = ['age', 'income', 'tenure', 'region', 'usage', 'support_calls', 'plan_tier', 'discount'];
  return features
    .map((feature) => ({ feature, importance: +(rng()).toFixed(3) }))
    .sort((a, b) => b.importance - a.importance);
}

/** Model explainability rows — SHAP, PDP, and ICE plots (shape: category_numeric). */
function generateExplainabilityData(): Record<string, unknown>[] {
  const features = ['age', 'income', 'tenure', 'usage'];
  const entities = Array.from({ length: 18 }, (_, i) => `acct_${String(i + 1).padStart(2, '0')}`);
  const rows: Record<string, unknown>[] = [];

  for (let featureIndex = 0; featureIndex < features.length; featureIndex++) {
    const feature = features[featureIndex];
    const center = featureIndex * 0.18;
    for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
      const step = entityIndex % 9;
      const featureValue = +(step / 8).toFixed(3);
      const wave = Math.sin((entityIndex + featureIndex) / 3);
      const shapValue = +(((featureValue - 0.5) * (1.7 - featureIndex * 0.22)) + wave * 0.18).toFixed(3);
      const predicted = +(0.42 + center + featureValue * (0.24 - featureIndex * 0.025) + wave * 0.035).toFixed(3);
      rows.push({
        entity: entities[entityIndex],
        feature,
        feature_value: featureValue,
        shap_value: shapValue,
        predicted,
      });
    }
  }

  return rows;
}

/**
 * id / parent / value tree — treemap/sunburst/node-link tree (shape: hierarchy).
 * Parent values are the SUM of their children so the area/radius charts partition
 * correctly; a zero-value root/division collapses treemap to one undifferentiated
 * tile and sunburst to a single ring.
 */
function generateHierarchyData(): Record<string, unknown>[] {
  const rng = makeRng(8);
  const divisions = ['Sales', 'Engineering', 'Operations'];
  const teamRows: Record<string, unknown>[] = [];
  const divisionRows: Record<string, unknown>[] = [];
  let companyTotal = 0;
  for (const div of divisions) {
    let divTotal = 0;
    for (let t = 1; t <= 3; t++) {
      const value = Math.round(10 + rng() * 90);
      teamRows.push({ id: `${div} Team ${t}`, parent: div, value });
      divTotal += value;
    }
    divisionRows.push({ id: div, parent: 'Company', value: divTotal });
    companyTotal += divTotal;
  }
  return [{ id: 'Company', parent: '', value: companyTotal }, ...divisionRows, ...teamRows];
}

/** source / target / value edges — sankey/force-directed graph (shape: source_target_value). */
function generateFlowData(): Record<string, unknown>[] {
  const rng = makeRng(9);
  const edges: [string, string][] = [
    ['Visit', 'Signup'], ['Visit', 'Bounce'], ['Signup', 'Trial'],
    ['Signup', 'Abandon'], ['Trial', 'Paid'], ['Trial', 'Churn'], ['Paid', 'Renew'],
  ];
  return edges.map(([source, target]) => ({ source, target, value: +(50 + rng() * 450).toFixed(0) }));
}

/** Ordered funnel stages with descending values — funnel chart (shape: category_numeric). */
function generateFunnelData(): Record<string, unknown>[] {
  const stages = ['Impressions', 'Clicks', 'Visits', 'Signups', 'Purchases'];
  let value = 10000;
  const rng = makeRng(10);
  return stages.map((stage) => {
    const row = { stage, value: Math.round(value) };
    value *= 0.35 + rng() * 0.3;
    return row;
  });
}

/** Three-stage customer journeys for alluvial diagrams. */
function generateJourneyData(): Record<string, unknown>[] {
  return [
    { stage1: 'Organic', stage2: 'Landing', stage3: 'Trial', value: 820 },
    { stage1: 'Organic', stage2: 'Docs', stage3: 'Trial', value: 360 },
    { stage1: 'Paid', stage2: 'Landing', stage3: 'Trial', value: 640 },
    { stage1: 'Paid', stage2: 'Webinar', stage3: 'Sales call', value: 410 },
    { stage1: 'Partner', stage2: 'Webinar', stage3: 'Sales call', value: 280 },
    { stage1: 'Partner', stage2: 'Docs', stage3: 'Trial', value: 220 },
  ];
}

/** row / col / value grid — heatmap & annotated heatmap (shape: matrix). */
function generateMatrixData(): Record<string, unknown>[] {
  const rng = makeRng(11);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['9am', '12pm', '3pm', '6pm'];
  const rows: Record<string, unknown>[] = [];
  for (const row of days) {
    for (const col of hours) {
      rows.push({ row, col, value: +(rng() * 100).toFixed(0) });
    }
  }
  return rows;
}

/** Process metric with control limits — control chart / run chart (shape: time_numeric). */
function generateProcessData(): Record<string, unknown>[] {
  const rng = makeRng(12);
  const rows: Record<string, unknown>[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 60; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const value = +(50 + Math.sin(i / 6) * 4 + gaussian(rng) * 2).toFixed(2);
    rows.push({
      date: date.toISOString().split('T')[0],
      value,
      ucl: 60,
      lcl: 40,
    });
  }
  return rows;
}

/** Forecast quantiles over time — fan chart (shape: time_numeric). */
function generateForecastData(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 36; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i * 7);
    const center = 100 + i * 1.8;
    const spread = 4 + i * 0.25;
    const lower = +(center - spread * 1.8).toFixed(2);
    const upper = +(center + spread * 1.8).toFixed(2);
    rows.push({
      date: date.toISOString().split('T')[0],
      center: +center.toFixed(2),
      lower,
      upper,
      p10: lower,
      p25: +(center - spread).toFixed(2),
      p50: +center.toFixed(2),
      p75: +(center + spread).toFixed(2),
      p90: upper,
    });
  }
  return rows;
}

/** KPI rows with bullet-chart ranges (shape: category_numeric). */
function generateKpiData(): Record<string, unknown>[] {
  return [
    { metric_name: 'Revenue', value: 128.4, label: 'Revenue', actual: 128.4, target: 140, range1: 90, range2: 120, range3: 160 },
    { metric_name: 'Retention', value: 87.2, label: 'Retention', actual: 87.2, target: 90, range1: 70, range2: 85, range3: 100 },
    { metric_name: 'Margin', value: 34.8, label: 'Margin', actual: 34.8, target: 38, range1: 20, range2: 30, range3: 45 },
  ];
}

/** Demographic counts and paired values (shape: category_numeric). */
function generateDemographicsData(): Record<string, unknown>[] {
  const ageBands = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60+'];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ageBands.length; i++) {
    const female = 42 + i * 7 + (i % 2) * 4;
    const male = 40 + i * 6 + ((i + 1) % 2) * 5;
    rows.push({
      age_band: ageBands[i],
      sex: 'Female',
      count: female,
      category: ageBands[i],
      left_value: female,
      right_value: male,
    });
    rows.push({
      age_band: ageBands[i],
      sex: 'Male',
      count: male,
      category: ageBands[i],
      left_value: female,
      right_value: male,
    });
  }
  return rows;
}

/** Project/event intervals — Gantt, swimlane, range bar, event timeline (shape: intervals). */
function generateTimelineData(): Record<string, unknown>[] {
  return [
    { task: 'Discovery', lane: 'Product', start: '2024-01-02', end: '2024-01-10', date: '2024-01-02', label: 'Kickoff' },
    { task: 'Prototype', lane: 'Design', start: '2024-01-08', end: '2024-01-19', date: '2024-01-08', label: 'Design start' },
    { task: 'Data contract', lane: 'Engineering', start: '2024-01-15', end: '2024-01-26', date: '2024-01-15', label: 'Schema freeze' },
    { task: 'Implementation', lane: 'Engineering', start: '2024-01-22', end: '2024-02-09', date: '2024-01-22', label: 'Build start' },
    { task: 'QA pass', lane: 'Quality', start: '2024-02-05', end: '2024-02-16', date: '2024-02-05', label: 'QA start' },
    { task: 'Launch prep', lane: 'Product', start: '2024-02-12', end: '2024-02-23', date: '2024-02-23', label: 'Launch' },
  ];
}

/** Topic model term weights — topic-term bubble chart (shape: category_numeric). */
function generateTopicData(): Record<string, unknown>[] {
  const topics = [
    ['Reliability', ['uptime', 'latency', 'incident', 'monitoring']],
    ['Growth', ['activation', 'referral', 'campaign', 'pipeline']],
    ['Support', ['ticket', 'handoff', 'resolution', 'feedback']],
  ] as const;
  const rows: Record<string, unknown>[] = [];
  for (let t = 0; t < topics.length; t++) {
    const [topic, terms] = topics[t];
    for (let i = 0; i < terms.length; i++) {
      rows.push({ topic, term: terms[i], word: terms[i], weight: +(0.18 + (4 - i) * 0.14 + t * 0.03).toFixed(2) });
    }
  }
  return rows;
}

/** Monthly cohorts by retained-period percentage — cohort heatmap / retention curve. */
function generateCohortData(): Record<string, unknown>[] {
  const cohorts = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024'];
  const rows: Record<string, unknown>[] = [];
  for (let c = 0; c < cohorts.length; c++) {
    for (let period = 0; period < 6; period++) {
      const decay = 100 - period * (12 + c) - c * 3;
      rows.push({ cohort: cohorts[c], period, retention: Math.max(18, decay) });
    }
  }
  return rows;
}

/** Source/target stage transitions — conversion path chart (shape: source_target_value). */
function generateConversionPathData(): Record<string, unknown>[] {
  return [
    { source: 'Landing', target: 'Signup', count: 4600 },
    { source: 'Landing', target: 'Exit', count: 1800 },
    { source: 'Signup', target: 'Onboarding', count: 3200 },
    { source: 'Signup', target: 'Dormant', count: 900 },
    { source: 'Onboarding', target: 'Activated', count: 2350 },
    { source: 'Activated', target: 'Paid', count: 1420 },
    { source: 'Activated', target: 'Expansion', count: 420 },
  ];
}

/** Entity rankings over time — bump chart (shape: time_series_numeric). */
function generateRankingData(): Record<string, unknown>[] {
  const entities = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
  const ranksByMonth = [
    [2, 1, 4, 3, 5],
    [1, 3, 2, 4, 5],
    [1, 2, 3, 5, 4],
    [3, 1, 2, 4, 5],
    [2, 1, 4, 3, 5],
  ];
  const rows: Record<string, unknown>[] = [];
  for (let month = 0; month < ranksByMonth.length; month++) {
    const date = `2024-${String(month + 1).padStart(2, '0')}-01`;
    for (let i = 0; i < entities.length; i++) {
      rows.push({ date, entity: entities[i], rank: ranksByMonth[month][i] });
    }
  }
  return rows;
}

/** Actor-to-actor interactions over ordered steps (shape: category_numeric). */
function generateSequenceData(): Record<string, unknown>[] {
  return [
    { order: 1, actor: 'User', action: 'request', target_actor: 'Frontend' },
    { order: 2, actor: 'Frontend', action: 'query', target_actor: 'API' },
    { order: 3, actor: 'API', action: 'lookup', target_actor: 'Warehouse' },
    { order: 4, actor: 'Warehouse', action: 'result', target_actor: 'API' },
    { order: 5, actor: 'API', action: 'response', target_actor: 'Frontend' },
    { order: 6, actor: 'Frontend', action: 'render', target_actor: 'User' },
  ];
}

/** Visible order book levels around midprice (shape: three_numeric). */
function generateOrderBookData(): Record<string, unknown>[] {
  const rng = makeRng(25);
  const rows: Record<string, unknown>[] = [];
  for (let i = -12; i <= 12; i++) {
    const distance = Math.abs(i);
    rows.push({
      price: +(100 + i * 0.25).toFixed(2),
      bid_size: i <= 0 ? Math.round((900 - distance * 45) * (0.85 + rng() * 0.3)) : 0,
      ask_size: i >= 0 ? Math.round((860 - distance * 42) * (0.85 + rng() * 0.3)) : 0,
    });
  }
  return rows;
}

/** Treasury-style rates by maturity in years (shape: two_numeric). */
function generateYieldCurveData(): Record<string, unknown>[] {
  return [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30].map((maturity) => ({
    maturity,
    yield: +(3.5 + Math.log1p(maturity) * 0.42 - Math.max(0, 4 - maturity) * 0.06).toFixed(2),
  }));
}

/** Intraday return magnitude by weekday and hour (shape: category_numeric). */
function generateTradingBucketsData(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let d = 0; d < weekdays.length; d++) {
    for (let hour = 9; hour <= 16; hour++) {
      const openCloseEffect = hour === 9 || hour === 16 ? 0.42 : 0;
      const value = 0.45 + d * 0.08 + Math.sin(hour / 2) * 0.12 + openCloseEffect;
      rows.push({ weekday: weekdays[d], hour, value: +value.toFixed(3) });
    }
  }
  return rows;
}

/** Time-to-event observations with censoring (shape: category_numeric). */
function generateSurvivalData(): Record<string, unknown>[] {
  const rng = makeRng(26);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 90; i++) {
    const group = i % 2 === 0 ? 'Treatment' : 'Control';
    const base = group === 'Treatment' ? 18 : 12;
    const time = Math.max(1, Math.round(base + gaussian(rng) * 5 + rng() * 18));
    rows.push({ time, event: rng() < (group === 'Treatment' ? 0.58 : 0.72) ? 1 : 0, group });
  }
  return rows;
}

/** Two-dimensional embeddings with facets/classes (shape: category_numeric). */
function generateEmbeddingData(): Record<string, unknown>[] {
  const rng = makeRng(27);
  const rows: Record<string, unknown>[] = [];
  const classes = ['Segment A', 'Segment B', 'Segment C'];
  for (let i = 0; i < 150; i++) {
    const cls = classes[i % classes.length];
    const offset = i % classes.length;
    const x = gaussian(rng) * 0.75 + offset * 2.1;
    const y = gaussian(rng) * 0.65 + Math.sin(offset + i / 18) * 1.2;
    rows.push({
      x: +x.toFixed(3),
      y: +y.toFixed(3),
      pc1: +(x * 0.82 + y * 0.18).toFixed(3),
      pc2: +(y * 0.77 - x * 0.12).toFixed(3),
      facet: cls,
      class: cls,
    });
  }
  return rows;
}

/** Latitude/longitude business locations â€” geographic point maps (shape: geo_points). */
function generateGeoData(): Record<string, unknown>[] {
  const cities = [
    { city: 'Seattle', latitude: 47.6062, longitude: -122.3321, value: 82, category: 'West', order: 1 },
    { city: 'San Francisco', latitude: 37.7749, longitude: -122.4194, value: 95, category: 'West', order: 2 },
    { city: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, value: 74, category: 'West', order: 3 },
    { city: 'Denver', latitude: 39.7392, longitude: -104.9903, value: 61, category: 'Mountain', order: 4 },
    { city: 'Austin', latitude: 30.2672, longitude: -97.7431, value: 68, category: 'Central', order: 5 },
    { city: 'Chicago', latitude: 41.8781, longitude: -87.6298, value: 88, category: 'Central', order: 6 },
    { city: 'Atlanta', latitude: 33.749, longitude: -84.388, value: 56, category: 'South', order: 7 },
    { city: 'New York', latitude: 40.7128, longitude: -74.006, value: 91, category: 'East', order: 8 },
    { city: 'Boston', latitude: 42.3601, longitude: -71.0589, value: 63, category: 'East', order: 9 },
    { city: 'Miami', latitude: 25.7617, longitude: -80.1918, value: 52, category: 'South', order: 10 },
  ];

  return cities.map((city, index) => {
    const next = cities[(index + 1) % cities.length];
    return {
      ...city,
      region: city.category,
      origin_lat: city.latitude,
      origin_lon: city.longitude,
      dest_lat: next.latitude,
      dest_lon: next.longitude,
      flow_value: Math.round((city.value + next.value) / 2),
    };
  });
}

export type SampleKey =
  | 'stock' | 'numeric' | 'sales' | 'classification' | 'regression'
  | 'estimates' | 'features' | 'hierarchy' | 'flow' | 'funnel' | 'matrix'
  | 'process' | 'forecast' | 'kpi' | 'demographics' | 'timeline'
  | 'topics' | 'cohort' | 'conversionPath' | 'ranking' | 'orderBook'
  | 'yieldCurve' | 'tradingBuckets' | 'survival' | 'embedding' | 'journey'
  | 'explainability' | 'sequence' | 'geo';

const SAMPLES: Record<SampleKey, { name: string; generate: () => Record<string, unknown>[] }> = {
  stock: { name: 'Stock Market (OHLCV + categories)', generate: generateStockData },
  numeric: { name: 'Numeric (distributions + scatter)', generate: generateNumericData },
  sales: { name: 'Sales by Region (category comparison)', generate: generateSalesData },
  classification: { name: 'Classifier Scores (ROC / PR / calibration)', generate: generateClassificationData },
  regression: { name: 'Regression Results (actual / predicted)', generate: generateRegressionData },
  estimates: { name: 'Estimates with CIs (error bars)', generate: generateEstimatesData },
  features: { name: 'Feature Importances', generate: generateFeaturesData },
  explainability: { name: 'Model Explainability (SHAP / PDP / ICE)', generate: generateExplainabilityData },
  hierarchy: { name: 'Org Hierarchy (id / parent / value)', generate: generateHierarchyData },
  flow: { name: 'Conversion Flow (source / target / value)', generate: generateFlowData },
  funnel: { name: 'Marketing Funnel (stage / value)', generate: generateFunnelData },
  journey: { name: 'Customer Journey (three-stage flows)', generate: generateJourneyData },
  matrix: { name: 'Activity Matrix (row / col / value)', generate: generateMatrixData },
  process: { name: 'Process Control (value + limits)', generate: generateProcessData },
  forecast: { name: 'Forecast Quantiles (fan chart)', generate: generateForecastData },
  kpi: { name: 'KPI Summary (cards + bullet chart)', generate: generateKpiData },
  demographics: { name: 'Demographics (population pyramid)', generate: generateDemographicsData },
  timeline: { name: 'Project Timeline (intervals + events)', generate: generateTimelineData },
  topics: { name: 'Topic Terms (weighted bubbles)', generate: generateTopicData },
  cohort: { name: 'Cohort Retention (period matrix)', generate: generateCohortData },
  conversionPath: { name: 'Conversion Path (stage transitions)', generate: generateConversionPathData },
  ranking: { name: 'Rankings Over Time (bump chart)', generate: generateRankingData },
  sequence: { name: 'Interaction Sequence (actor / action / target)', generate: generateSequenceData },
  orderBook: { name: 'Order Book Depth (bid / ask)', generate: generateOrderBookData },
  yieldCurve: { name: 'Yield Curve (maturity / rate)', generate: generateYieldCurveData },
  tradingBuckets: { name: 'Trading Buckets (weekday / hour)', generate: generateTradingBucketsData },
  survival: { name: 'Survival Observations (time / event)', generate: generateSurvivalData },
  embedding: { name: 'Embedding Coordinates (PCA / t-SNE / UMAP)', generate: generateEmbeddingData },
  geo: { name: 'Geographic Points (lat / lon)', generate: generateGeoData },
};

export function getSampleOptions(): { label: string; value: SampleKey }[] {
  return Object.entries(SAMPLES).map(([key, { name }]) => ({
    label: name,
    value: key as SampleKey,
  }));
}

export function loadSampleData(key: SampleKey): DataSet {
  const { generate } = SAMPLES[key];
  const rows = generate();
  /* v8 ignore next */
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns = analyzeColumns(rows, columnNames);
  const shape = detectShape(columns);

  const columnArrays: Record<string, unknown[]> = {};
  for (const col of columnNames) {
    columnArrays[col] = rows.map((r) => r[col]);
  }

  return {
    id: crypto.randomUUID(),
    name: `sample_${key}.csv`,
    rows,
    columnArrays,
    columns,
    rowCount: rows.length,
    shape,
    fileSize: JSON.stringify(rows).length,
    loadedAt: new Date(),
  };
}

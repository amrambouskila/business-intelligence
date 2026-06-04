import type { ColumnMeta, ColumnType, DataShape, NumericStats } from '@/types/data';

/** Type-inference + shape-detection thresholds (no magic numbers in the logic below). */
const SAMPLE_SIZE = 100;
const DATE_NAME_CONFIDENCE = 0.8;
const STRING_DATE_SAMPLE = 20;
const STRING_DATE_MIN_MATCHES = 15;
const CATEGORY_UNIQUE_RATIO = 0.3;
const CATEGORY_MAX_UNIQUE = 20;
const MANY_NUMERIC_MIN = 5;

/** Analyze raw rows and produce column metadata. */
export function analyzeColumns(
  rows: Record<string, unknown>[],
  columnNames: string[],
): ColumnMeta[] {
  return columnNames.map((name) => {
    const values = rows.map((r) => r[name]);
    const nonNull = values.filter((v) => v != null);
    const type = inferType(name, nonNull);
    const uniqueCount = new Set(nonNull.map(String)).size;

    const meta: ColumnMeta = {
      name,
      type,
      nullable: nonNull.length < values.length,
      uniqueCount,
      nullCount: values.length - nonNull.length,
    };

    if (type === 'numeric' || type === 'integer' || type === 'float') {
      meta.stats = computeStats(nonNull as number[]);
    }

    if (type === 'category' || type === 'text') {
      const counts = new Map<string, number>();
      for (const v of nonNull) {
        const s = String(v);
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      meta.topValues = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
    }

    if (type === 'datetime' || type === 'date') {
      const dates = nonNull.map((v) => new Date(v as string | number)).filter((d) => !isNaN(d.getTime()));
      /* v8 ignore next -- inferType only returns date-like types after at least one parseable value exists. */
      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        meta.dateRange = { min: dates[0], max: dates[dates.length - 1] };
      }
    }

    return meta;
  });
}

function inferType(name: string, values: unknown[]): ColumnType {
  if (values.length === 0) return 'unknown';

  const sample = values.slice(0, SAMPLE_SIZE);
  const isNumericSample =
    sample.every((v) => typeof v === 'number' && !isNaN(v as number));

  // Geo coordinates: name takes precedence over numeric because lat/lng are
  // always numeric but need special downstream handling (geo_points shape).
  if (isNumericSample && (/^(lat|latitude)$/i.test(name) || /^(lon|lng|longitude)$/i.test(name))) {
    return 'geo_point';
  }

  // Check boolean
  if (sample.every((v) => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1)) {
    return 'boolean';
  }

  // Check numeric
  if (isNumericSample) {
    const allInts = sample.every((v) => Number.isInteger(v));
    return allInts ? 'integer' : 'float';
  }

  // Check datetime by name heuristic + value parsing. (No bare 'at' — it matched
  // unrelated columns like category/latitude/status and forced them to datetime.)
  const dtNames = ['date', 'time', 'timestamp', 'datetime', 'created', 'updated'];
  const nameLower = name.toLowerCase();
  if (dtNames.some((n) => nameLower.includes(n))) {
    const parsed = sample.map((v) => new Date(v as string));
    if (parsed.filter((d) => !isNaN(d.getTime())).length > sample.length * DATE_NAME_CONFIDENCE) {
      return 'datetime';
    }
  }

  // Check if string values parse as dates
  if (sample.every((v) => typeof v === 'string')) {
    const parsed = sample.slice(0, STRING_DATE_SAMPLE).map((v) => new Date(v as string));
    if (parsed.filter((d) => !isNaN(d.getTime())).length > STRING_DATE_MIN_MATCHES) {
      return 'datetime';
    }
  }

  // Categorical vs text: low unique ratio = category
  const uniqueCount = new Set(sample.map(String)).size;
  const uniqueRatio = uniqueCount / sample.length;
  if (uniqueRatio < CATEGORY_UNIQUE_RATIO || uniqueCount <= CATEGORY_MAX_UNIQUE) {
    return 'category';
  }

  return 'text';
}

function computeStats(values: number[]): NumericStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((a, v) => a + (v - mean) ** 2, 0) / n;

  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
    std: Math.sqrt(variance),
    q25: sorted[Math.floor(n * 0.25)],
    q75: sorted[Math.floor(n * 0.75)],
  };
}

/** Detect the overall dataset shape from column metadata. */
export function detectShape(columns: ColumnMeta[]): DataShape {
  const numCols = columns.filter((c) => ['numeric', 'integer', 'float'].includes(c.type));
  const dtCols = columns.filter((c) => c.type === 'datetime' || c.type === 'date');
  const catCols = columns.filter((c) => c.type === 'category');
  const geoCols = columns.filter((c) => c.type === 'geo_point');

  // OHLCV
  const names = new Set(columns.map((c) => c.name.toLowerCase()));
  if (['open', 'high', 'low', 'close'].every((n) => names.has(n))) {
    return 'ohlcv';
  }

  // Matrix / pivot: explicit row + col + value (named, like OHLCV) so integer
  // index columns named row/col don't mis-fire.
  if (['row', 'col', 'value'].every((n) => names.has(n))) {
    return 'matrix';
  }

  // Geo
  if (geoCols.length >= 2) return 'geo_points';

  // Hierarchy: id + parent columns
  const hasId = columns.some((c) => /^(id|node_id)$/i.test(c.name));
  const hasParent = columns.some((c) => /^(parent|parent_id)$/i.test(c.name));
  if (hasId && hasParent) return 'hierarchy';

  // Network: source + target
  const hasSource = columns.some((c) => /^(source|from)$/i.test(c.name));
  const hasTarget = columns.some((c) => /^(target|to)$/i.test(c.name));
  if (hasSource && hasTarget) {
    const hasValue = numCols.length >= 1;
    return hasValue ? 'source_target_value' : 'nodes_edges';
  }

  // Intervals: start + end
  const hasStart = columns.some((c) => /^(start|begin|start_date)$/i.test(c.name));
  const hasEnd = columns.some((c) => /^(end|finish|end_date)$/i.test(c.name));
  if (hasStart && hasEnd) return 'intervals';

  // Time series variants (numCols >= 1 already guaranteed by the outer guard)
  if (dtCols.length >= 1 && numCols.length >= 1) {
    if (catCols.length >= 1) return 'time_series_numeric';
    return 'time_numeric';
  }

  // Many numeric columns -> multivariate (correlation / pair plot); categories don't change this
  if (numCols.length >= MANY_NUMERIC_MIN) return 'many_numeric';
  // A category plus one or more (but few) numerics -> categorical comparison (bar / box / grouped)
  if (catCols.length >= 1 && numCols.length >= 1) return 'category_numeric';
  // Pure numeric (no categories)
  if (numCols.length === 3 && catCols.length === 0) return 'three_numeric';
  if (numCols.length === 2 && catCols.length === 0) return 'two_numeric';
  if (numCols.length === 1) return 'single_numeric';

  return 'generic';
}

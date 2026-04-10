/** Primitive column types the system recognizes. */
export type ColumnType =
  | 'numeric'
  | 'integer'
  | 'float'
  | 'datetime'
  | 'date'
  | 'category'
  | 'text'
  | 'boolean'
  | 'geo_point'
  | 'geo_polygon'
  | 'unknown';

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q25: number;
  q75: number;
}

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullable: boolean;
  uniqueCount: number;
  nullCount: number;
  stats?: NumericStats;
  topValues?: Array<{ value: string; count: number }>;
  dateRange?: { min: Date; max: Date; frequency?: string };
}

export type DataShape =
  | 'single_numeric'
  | 'category_numeric'
  | 'time_numeric'
  | 'time_series_numeric'
  | 'two_numeric'
  | 'three_numeric'
  | 'many_numeric'
  | 'matrix'
  | 'hierarchy'
  | 'nodes_edges'
  | 'source_target_value'
  | 'geo_points'
  | 'geo_polygons'
  | 'intervals'
  | 'ohlcv'
  | 'survival'
  | 'event_log'
  | 'generic';

/** A loaded dataset stored in memory as typed arrays. */
export interface DataSet {
  id: string;
  name: string;
  /** Row-oriented data — each row is a record. */
  rows: Record<string, unknown>[];
  /** Columnar index for fast access. */
  columnArrays: Record<string, unknown[]>;
  columns: ColumnMeta[];
  rowCount: number;
  shape: DataShape;
  fileSize: number;
  loadedAt: Date;
}

/** A filtered/transformed view of a DataSet. */
export interface DataView {
  sourceId: string;
  rows: Record<string, unknown>[];
  columnArrays: Record<string, unknown[]>;
  columns: ColumnMeta[];
  rowCount: number;
  filters: Filter[];
}

export interface Filter {
  id: string;
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'regex';
  value: unknown;
  active: boolean;
}

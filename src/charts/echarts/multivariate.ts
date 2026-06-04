import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

export interface NumericRows {
  names: string[];
  rows: number[][];
}

export interface MatrixValue {
  row: string;
  col: string;
  value: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function finiteNumericRows(data: DataView, config: ChartConfig, roles: string[]): NumericRows {
  const names = roles.map((role) => config.columns[role]).filter((name): name is string => Boolean(name));
  const arrays = names.map((name) => data.columnArrays[name] ?? []);
  const rowCount = arrays.length === 0 ? 0 : Math.min(...arrays.map((array) => array.length));
  const rows: number[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = arrays.map((array) => array[i]);
    if (row.every(isFiniteNumber)) rows.push(row);
  }

  return { names, rows };
}

export function extent(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = values.reduce((a, b) => (a < b ? a : b), Infinity);
  const max = values.reduce((a, b) => (a > b ? a : b), -Infinity);
  return min === max ? { min: min - 0.5, max: max + 0.5 } : { min, max };
}

export function columnExtents(rows: number[][]): { min: number; max: number }[] {
  const width = rows[0]?.length ?? 0;
  return Array.from({ length: width }, (_v, col) => extent(rows.map((row) => row[col])));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function covariance(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const aMean = mean(a);
  const bMean = mean(b);
  const sum = a.reduce((total, value, i) => total + (value - aMean) * (b[i] - bMean), 0);
  return sum / (a.length - 1);
}

export function associationMatrix(input: NumericRows, mode: 'correlation' | 'covariance'): MatrixValue[] {
  return input.names.flatMap((rowName, rowIndex) => input.names.map((colName, colIndex) => {
    const rowValues = input.rows.map((row) => row[rowIndex]);
    const colValues = input.rows.map((row) => row[colIndex]);
    const cov = covariance(rowValues, colValues);
    const value = mode === 'covariance' ? cov : cov / Math.sqrt(Math.max(covariance(rowValues, rowValues) * covariance(colValues, colValues), Number.EPSILON));
    return { row: rowName, col: colName, value };
  }));
}

export function radvizPoints(input: NumericRows): [number, number][] {
  const ranges = columnExtents(input.rows);
  const anchors = input.names.map((_name, i) => {
    const angle = (i / input.names.length) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });

  return input.rows.map((row) => {
    let weightSum = 0;
    let x = 0;
    let y = 0;
    row.forEach((value, i) => {
      const range = ranges[i];
      const weight = (value - range.min) / (range.max - range.min);
      weightSum += weight;
      x += anchors[i][0] * weight;
      y += anchors[i][1] * weight;
    });
    if (weightSum === 0) return [0, 0];
    const projectedX = x / weightSum;
    const projectedY = y / weightSum;
    return [Math.abs(projectedX) < Number.EPSILON ? 0 : projectedX, Math.abs(projectedY) < Number.EPSILON ? 0 : projectedY];
  });
}

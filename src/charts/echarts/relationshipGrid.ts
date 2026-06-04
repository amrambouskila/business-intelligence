import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

export type XYPoint = [number, number];
export type XYZPoint = [number, number, number];

export interface GridCell {
  xIndex: number;
  yIndex: number;
  xCenter: number;
  yCenter: number;
  value: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function finiteXY(data: DataView, config: ChartConfig): XYPoint[] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const ys = data.columnArrays[config.columns['y']] ?? [];
  const out: XYPoint[] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (isFiniteNumber(x) && isFiniteNumber(y)) out.push([x, y]);
  }
  return out;
}

export function finiteXYZ(data: DataView, config: ChartConfig): XYZPoint[] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const ys = data.columnArrays[config.columns['y']] ?? [];
  const zs = data.columnArrays[config.columns['z']] ?? [];
  const out: XYZPoint[] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length, zs.length); i++) {
    const x = xs[i];
    const y = ys[i];
    const z = zs[i];
    if (isFiniteNumber(x) && isFiniteNumber(y) && isFiniteNumber(z)) out.push([x, y, z]);
  }
  return out;
}

function extent(values: number[]): [number, number] {
  const min = values.reduce((a, b) => (a < b ? a : b), Infinity);
  const max = values.reduce((a, b) => (a > b ? a : b), -Infinity);
  if (min === max) return [min - 0.5, max + 0.5];
  return [min, max];
}

export function binLabel(center: number): string {
  return center.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function densityGrid(points: XYPoint[], bins: number): { cells: GridCell[]; xLabels: string[]; yLabels: string[]; maxValue: number } {
  if (points.length === 0) return { cells: [], xLabels: [], yLabels: [], maxValue: 0 };
  const n = Math.max(1, Math.floor(bins));
  const [xMin, xMax] = extent(points.map((point) => point[0]));
  const [yMin, yMax] = extent(points.map((point) => point[1]));
  const xWidth = (xMax - xMin) / n;
  const yWidth = (yMax - yMin) / n;
  const counts = new Map<string, GridCell>();

  for (const [x, y] of points) {
    const xIndex = Math.min(Math.floor((x - xMin) / xWidth), n - 1);
    const yIndex = Math.min(Math.floor((y - yMin) / yWidth), n - 1);
    const key = `${xIndex}:${yIndex}`;
    const existing = counts.get(key);
    if (existing) {
      existing.value += 1;
    } else {
      counts.set(key, {
        xIndex,
        yIndex,
        xCenter: xMin + (xIndex + 0.5) * xWidth,
        yCenter: yMin + (yIndex + 0.5) * yWidth,
        value: 1,
      });
    }
  }

  const xLabels = Array.from({ length: n }, (_v, i) => binLabel(xMin + (i + 0.5) * xWidth));
  const yLabels = Array.from({ length: n }, (_v, i) => binLabel(yMin + (i + 0.5) * yWidth));
  const cells = Array.from(counts.values()).sort((a, b) => a.xIndex - b.xIndex || a.yIndex - b.yIndex);
  const maxValue = cells.reduce((max, cell) => (cell.value > max ? cell.value : max), 0);
  return { cells, xLabels, yLabels, maxValue };
}

export function meanGrid(points: XYZPoint[], bins: number): { cells: GridCell[]; xLabels: string[]; yLabels: string[]; minValue: number; maxValue: number } {
  if (points.length === 0) return { cells: [], xLabels: [], yLabels: [], minValue: 0, maxValue: 0 };
  const n = Math.max(1, Math.floor(bins));
  const [xMin, xMax] = extent(points.map((point) => point[0]));
  const [yMin, yMax] = extent(points.map((point) => point[1]));
  const xWidth = (xMax - xMin) / n;
  const yWidth = (yMax - yMin) / n;
  const sums = new Map<string, GridCell & { count: number }>();

  for (const [x, y, z] of points) {
    const xIndex = Math.min(Math.floor((x - xMin) / xWidth), n - 1);
    const yIndex = Math.min(Math.floor((y - yMin) / yWidth), n - 1);
    const key = `${xIndex}:${yIndex}`;
    const existing = sums.get(key);
    if (existing) {
      existing.value += z;
      existing.count += 1;
    } else {
      sums.set(key, {
        xIndex,
        yIndex,
        xCenter: xMin + (xIndex + 0.5) * xWidth,
        yCenter: yMin + (yIndex + 0.5) * yWidth,
        value: z,
        count: 1,
      });
    }
  }

  const xLabels = Array.from({ length: n }, (_v, i) => binLabel(xMin + (i + 0.5) * xWidth));
  const yLabels = Array.from({ length: n }, (_v, i) => binLabel(yMin + (i + 0.5) * yWidth));
  const cells = Array.from(sums.values())
    .map(({ count, ...cell }) => ({ ...cell, value: cell.value / count }))
    .sort((a, b) => a.xIndex - b.xIndex || a.yIndex - b.yIndex);
  const values = cells.map((cell) => cell.value);
  return {
    cells,
    xLabels,
    yLabels,
    minValue: values.reduce((a, b) => (a < b ? a : b), Infinity),
    maxValue: values.reduce((a, b) => (a > b ? a : b), -Infinity),
  };
}

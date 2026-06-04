import type { OrbitViewState } from '@deck.gl/core';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

export type Point3D = {
  x: number;
  y: number;
  z: number;
  value?: number;
};

export type SurfaceCell = {
  polygon: Array<[number, number, number]>;
  value: number;
};

export type Path3D = {
  path: Array<[number, number, number]>;
  value: number;
};

function column(data: DataView, config: ChartConfig, role: string): unknown[] {
  return (data.columnArrays[config.columns[role]] ?? []) as unknown[];
}

function optionalFinite(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function finite3DPoints(data: DataView, config: ChartConfig): Point3D[] {
  const xData = column(data, config, 'x');
  const yData = column(data, config, 'y');
  const zData = column(data, config, 'z');
  const valueData = column(data, config, 'value');
  const points: Point3D[] = [];

  for (let i = 0; i < Math.min(xData.length, yData.length, zData.length); i++) {
    const x = Number(xData[i]);
    const y = Number(yData[i]);
    const z = Number(zData[i]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      const value = optionalFinite(valueData[i]);
      points.push({ x, y, z, ...(value === undefined ? {} : { value }) });
    }
  }

  return points;
}

export function numericExtent(values: Array<number | undefined>): [number, number] {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (finite.length === 0) return [0, 0];
  return [Math.min(...finite), Math.max(...finite)];
}

export function scaleValue(value: number | undefined, extent: [number, number], min: number, max: number): number {
  if (value === undefined) return min;
  const [low, high] = extent;
  if (high <= low) return (min + max) / 2;
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return min + t * (max - min);
}

export function hexToRgba(color: string, alpha: number, fallback: string): [number, number, number, number] {
  const hex = color.trim().replace(/^#/, '');
  const expanded = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const fallbackHex = fallback.trim().replace(/^#/, '');
  const expandedFallback = fallbackHex.length === 3 ? fallbackHex.split('').map((char) => `${char}${char}`).join('') : fallbackHex;
  const value = /^[0-9a-f]{6}$/i.test(expanded) ? expanded : expandedFallback;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    Math.round(Math.max(0, Math.min(1, alpha)) * 255),
  ];
}

export function paletteColor(theme: ThemeTokens, index: number, alpha: number): [number, number, number, number] {
  return hexToRgba(theme.colorScale[index % Math.max(1, theme.colorScale.length)] ?? theme.foreground, alpha, theme.foreground);
}

export function valueColor(value: number | undefined, extent: [number, number], theme: ThemeTokens, alpha: number): [number, number, number, number] {
  return paletteColor(theme, Math.round(scaleValue(value, extent, 0, Math.max(0, theme.colorScale.length - 1))), alpha);
}

export function orbitViewState(): OrbitViewState {
  return { target: [0, 0, 0], zoom: 1, rotationX: 50, rotationOrbit: -35 };
}

export function normalizedPoints(points: Point3D[]): Point3D[] {
  if (points.length === 0) return [];
  const xExtent = numericExtent(points.map((point) => point.x));
  const yExtent = numericExtent(points.map((point) => point.y));
  const zExtent = numericExtent(points.map((point) => point.z));
  return points.map((point) => ({
    ...point,
    x: scaleValue(point.x, xExtent, -60, 60),
    y: scaleValue(point.y, yExtent, -60, 60),
    z: scaleValue(point.z, zExtent, -35, 65),
  }));
}

export function surfaceCells(points: Point3D[], bins = 7): SurfaceCell[] {
  const normalized = normalizedPoints(points);
  if (normalized.length === 0) return [];
  const cells = new Map<string, { x: number; y: number; z: number; value: number; count: number }>();

  for (const point of normalized) {
    const xBin = Math.min(bins - 1, Math.max(0, Math.floor(((point.x + 60) / 120) * bins)));
    const yBin = Math.min(bins - 1, Math.max(0, Math.floor(((point.y + 60) / 120) * bins)));
    const key = `${xBin}:${yBin}`;
    const existing = cells.get(key) ?? { x: xBin, y: yBin, z: 0, value: 0, count: 0 };
    existing.z += point.z;
    existing.value += point.value ?? point.z;
    existing.count += 1;
    cells.set(key, existing);
  }

  const step = 120 / bins;
  return [...cells.values()].map((cell) => {
    const west = -60 + cell.x * step;
    const east = west + step;
    const south = -60 + cell.y * step;
    const north = south + step;
    const z = cell.z / cell.count;
    return {
      value: cell.value / cell.count,
      polygon: [
        [west, south, z],
        [east, south, z],
        [east, north, z],
        [west, north, z],
        [west, south, z],
      ],
    };
  });
}

export function wireframePaths(cells: SurfaceCell[]): Path3D[] {
  return cells.flatMap((cell) => [
    { path: cell.polygon, value: cell.value },
    ...cell.polygon.slice(0, 4).map((point) => ({
      path: [[point[0], point[1], -35] as [number, number, number], point],
      value: cell.value,
    })),
  ]);
}

export function contourPaths(cells: SurfaceCell[], thresholds: number[]): Path3D[] {
  return thresholds.flatMap((threshold) => cells
    .filter((cell) => cell.value >= threshold)
    .map((cell) => ({
      path: cell.polygon.map(([x, y]) => [x, y, scaleValue(threshold, numericExtent(thresholds), -20, 60)] as [number, number, number]),
      value: threshold,
    })));
}

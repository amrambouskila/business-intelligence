import type { MapViewState } from '@deck.gl/core';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

export type GeoPoint = {
  latitude: number;
  longitude: number;
  value?: number;
  category?: string;
  order?: number;
  label?: string;
};

export type GeoCell = GeoPoint & {
  polygon: Array<[number, number]>;
};

export type GeoRegion = {
  region: string;
  value: number;
  polygon: Array<[number, number]>;
  center: [number, number];
};

export type GeoFlow = {
  origin: [number, number];
  destination: [number, number];
  value: number;
};

type GeoRoles = {
  lat?: string;
  lon?: string;
  value?: string;
  category?: string;
  order?: string;
  label?: string;
};

type RegionRoles = {
  region?: string;
  value?: string;
};

type FlowRoles = {
  originLat?: string;
  originLon?: string;
  destLat?: string;
  destLon?: string;
  value?: string;
};

const REGION_POLYGONS: Record<string, Array<[number, number]>> = {
  West: [[-125, 32], [-112, 32], [-112, 49], [-125, 49], [-125, 32]],
  Mountain: [[-112, 31], [-102, 31], [-102, 49], [-112, 49], [-112, 31]],
  Central: [[-102, 29], [-87, 29], [-87, 49], [-102, 49], [-102, 29]],
  South: [[-98, 24], [-80, 24], [-80, 36], [-98, 36], [-98, 24]],
  East: [[-84, 36], [-67, 36], [-67, 47], [-84, 47], [-84, 36]],
};

function column(data: DataView, config: ChartConfig, role: string): unknown[] {
  return (data.columnArrays[config.columns[role]] ?? []) as unknown[];
}

function optionalFinite(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function finiteGeoPoints(data: DataView, config: ChartConfig, roles: GeoRoles = {}): GeoPoint[] {
  const latRole = roles.lat ?? 'lat';
  const lonRole = roles.lon ?? 'lon';
  const valueRole = roles.value ?? 'value';
  const categoryRole = roles.category ?? 'category';
  const orderRole = roles.order ?? 'order';
  const labelRole = roles.label ?? 'label';

  const latData = column(data, config, latRole);
  const lonData = column(data, config, lonRole);
  const valueData = column(data, config, valueRole);
  const categoryData = column(data, config, categoryRole);
  const orderData = column(data, config, orderRole);
  const labelData = column(data, config, labelRole);
  const points: GeoPoint[] = [];

  for (let i = 0; i < Math.min(latData.length, lonData.length); i++) {
    const latitude = Number(latData[i]);
    const longitude = Number(lonData[i]);
    if (
      Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180
    ) {
      const value = optionalFinite(valueData[i]);
      const order = optionalFinite(orderData[i]);
      points.push({
        latitude,
        longitude,
        ...(value === undefined ? {} : { value }),
        ...(categoryData[i] == null ? {} : { category: String(categoryData[i]) }),
        ...(order === undefined ? {} : { order }),
        ...(labelData[i] == null ? {} : { label: String(labelData[i]) }),
      });
    }
  }

  return points;
}

export function hexToRgba(color: string, alpha: number, fallback: string): [number, number, number, number] {
  const hex = color.trim().replace(/^#/, '');
  const expanded = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex;
  const fallbackHex = fallback.trim().replace(/^#/, '');
  const expandedFallback = fallbackHex.length === 3
    ? fallbackHex.split('').map((char) => `${char}${char}`).join('')
    : fallbackHex;
  const value = /^[0-9a-f]{6}$/i.test(expanded)
    ? expanded
    : expandedFallback;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    Math.round(Math.max(0, Math.min(1, alpha)) * 255),
  ];
}

export function mapViewState(points: GeoPoint[]): MapViewState {
  if (points.length === 0) {
    return { longitude: 0, latitude: 0, zoom: 1, pitch: 0, bearing: 0 };
  }

  const bounds = points.reduce(
    (acc, point) => ({
      minLat: Math.min(acc.minLat, point.latitude),
      maxLat: Math.max(acc.maxLat, point.latitude),
      minLon: Math.min(acc.minLon, point.longitude),
      maxLon: Math.max(acc.maxLon, point.longitude),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
  );
  const latSpan = Math.max(0.01, bounds.maxLat - bounds.minLat);
  const lonSpan = Math.max(0.01, bounds.maxLon - bounds.minLon);
  const span = Math.max(latSpan, lonSpan);
  const zoom = Math.max(1, Math.min(10, 7 - Math.log2(span)));

  return {
    longitude: (bounds.minLon + bounds.maxLon) / 2,
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

export function numericExtent(values: Array<number | undefined>): [number, number] {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (finite.length === 0) return [0, 0];
  return [Math.min(...finite), Math.max(...finite)];
}

export function scaledRadius(value: number | undefined, extent: [number, number], minRadius: number, maxRadius: number): number {
  if (value === undefined) return minRadius;
  const [min, max] = extent;
  if (max <= min) return (minRadius + maxRadius) / 2;
  const t = (value - min) / (max - min);
  return minRadius + Math.max(0, Math.min(1, t)) * (maxRadius - minRadius);
}

export function paletteColor(theme: ThemeTokens, index: number, alpha: number): [number, number, number, number] {
  return hexToRgba(theme.colorScale[index % Math.max(1, theme.colorScale.length)] ?? theme.foreground, alpha, theme.foreground);
}

export function valueColor(value: number | undefined, extent: [number, number], theme: ThemeTokens, alpha: number): [number, number, number, number] {
  const maxIndex = Math.max(0, theme.colorScale.length - 1);
  return paletteColor(theme, Math.round(scaledRadius(value, extent, 0, maxIndex)), alpha);
}

export function sequentialColorRange(theme: ThemeTokens, alpha: number): Array<[number, number, number, number]> {
  const colors = theme.sequentialScale.length > 0 ? theme.sequentialScale : theme.colorScale;
  return (colors.length > 0 ? colors : [theme.foreground]).map((color) => hexToRgba(color, alpha, theme.foreground));
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function boundaries(values: number[], fallbackPadding: number): number[] {
  if (values.length === 1) return [values[0] - fallbackPadding, values[0] + fallbackPadding];
  return [
    values[0] - fallbackPadding,
    ...values.slice(0, -1).map((value, index) => (value + values[index + 1]) / 2),
    values.at(-1)! + fallbackPadding,
  ];
}

export function rectangularGeoCells(points: GeoPoint[]): GeoCell[] {
  if (points.length === 0) return [];

  const latitudes = sortedUnique(points.map((point) => point.latitude));
  const longitudes = sortedUnique(points.map((point) => point.longitude));
  const latSpan = Math.max(1, latitudes.at(-1)! - latitudes[0]);
  const lonSpan = Math.max(1, longitudes.at(-1)! - longitudes[0]);
  const latBounds = boundaries(latitudes, Math.min(5, latSpan / Math.max(2, latitudes.length)));
  const lonBounds = boundaries(longitudes, Math.min(5, lonSpan / Math.max(2, longitudes.length)));

  return points.map((point) => {
    const latIndex = latitudes.indexOf(point.latitude);
    const lonIndex = longitudes.indexOf(point.longitude);
    const south = Math.max(-90, latBounds[latIndex]);
    const north = Math.min(90, latBounds[latIndex + 1]);
    const west = Math.max(-180, lonBounds[lonIndex]);
    const east = Math.min(180, lonBounds[lonIndex + 1]);

    return {
      ...point,
      polygon: [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    };
  });
}

function polygonCenter(polygon: Array<[number, number]>): [number, number] {
  const ring = polygon.slice(0, -1);
  const [lonSum, latSum] = ring.reduce(
    ([lon, lat], point) => [lon + point[0], lat + point[1]],
    [0, 0],
  );
  return [lonSum / Math.max(1, ring.length), latSum / Math.max(1, ring.length)];
}

function fallbackPolygon(index: number): Array<[number, number]> {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const west = -125 + col * 8;
  const south = 24 + row * 6;
  return [
    [west, south],
    [west + 6, south],
    [west + 6, south + 4],
    [west, south + 4],
    [west, south],
  ];
}

export function finiteGeoRegions(data: DataView, config: ChartConfig, roles: RegionRoles = {}): GeoRegion[] {
  const regionRole = roles.region ?? 'region';
  const valueRole = roles.value ?? 'value';
  const regionData = column(data, config, regionRole);
  const valueData = column(data, config, valueRole);
  const regions = new Map<string, { value: number; index: number }>();

  for (let i = 0; i < regionData.length; i++) {
    if (regionData[i] == null) continue;
    const region = String(regionData[i]);
    const value = optionalFinite(valueData[i]);
    if (value === undefined) continue;
    const existing = regions.get(region);
    if (existing) {
      existing.value += value;
    } else {
      regions.set(region, { value, index: regions.size });
    }
  }

  return [...regions.entries()].map(([region, { value, index }]) => {
    const polygon = REGION_POLYGONS[region] ?? fallbackPolygon(index);
    return { region, value, polygon, center: polygonCenter(polygon) };
  });
}

export function mapViewStateForRegions(regions: GeoRegion[]): MapViewState {
  return mapViewState(regions.map((region) => ({ latitude: region.center[1], longitude: region.center[0] })));
}

function finiteCoordinate(latitude: unknown, longitude: unknown): [number, number] | undefined {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (
    Number.isFinite(lat)
    && Number.isFinite(lon)
    && lat >= -90
    && lat <= 90
    && lon >= -180
    && lon <= 180
  ) {
    return [lon, lat];
  }
  return undefined;
}

export function finiteGeoFlows(data: DataView, config: ChartConfig, roles: FlowRoles = {}): GeoFlow[] {
  const originLatData = column(data, config, roles.originLat ?? 'origin_lat');
  const originLonData = column(data, config, roles.originLon ?? 'origin_lon');
  const destLatData = column(data, config, roles.destLat ?? 'dest_lat');
  const destLonData = column(data, config, roles.destLon ?? 'dest_lon');
  const valueData = column(data, config, roles.value ?? 'value');
  const flows: GeoFlow[] = [];

  for (let i = 0; i < Math.min(originLatData.length, originLonData.length, destLatData.length, destLonData.length); i++) {
    const origin = finiteCoordinate(originLatData[i], originLonData[i]);
    const destination = finiteCoordinate(destLatData[i], destLonData[i]);
    const value = optionalFinite(valueData[i]);
    if (origin && destination && value !== undefined) {
      flows.push({ origin, destination, value });
    }
  }

  return flows;
}

export function mapViewStateForFlows(flows: GeoFlow[]): MapViewState {
  return mapViewState(flows.flatMap((flow) => [
    { longitude: flow.origin[0], latitude: flow.origin[1] },
    { longitude: flow.destination[0], latitude: flow.destination[1] },
  ]));
}

export function scaledPolygon(region: GeoRegion, scale: number): Array<[number, number]> {
  const [centerLon, centerLat] = region.center;
  return region.polygon.map(([lon, lat]) => [
    centerLon + (lon - centerLon) * scale,
    centerLat + (lat - centerLat) * scale,
  ]);
}

export function tileGridRegions(regions: GeoRegion[]): GeoRegion[] {
  return regions.map((region, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const west = -124 + col * 7;
    const south = 25 + row * 6;
    const polygon: Array<[number, number]> = [
      [west, south],
      [west + 5.5, south],
      [west + 5.5, south + 4.5],
      [west, south + 4.5],
      [west, south],
    ];
    return { ...region, polygon, center: polygonCenter(polygon) };
  });
}

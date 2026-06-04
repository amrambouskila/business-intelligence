import type { LayerConfig } from '@/stores/chart-store';
import type { Annotation } from '@/stores/annotation-store';
import type { DataSet, DataView, Filter } from '@/types/data';

export interface ChartSpecExport {
  version: 1;
  exportedAt: string;
  dataset: {
    id: string;
    name: string;
    rowCount: number;
    shape: DataSet['shape'];
    columns: DataSet['columns'];
  };
  activeLayer: Pick<LayerConfig, 'chartType' | 'columns' | 'options' | 'axis' | 'visible'> | null;
  activeLayerIndex: number | null;
  layers: Array<Pick<LayerConfig, 'id' | 'chartType' | 'columns' | 'options' | 'axis' | 'visible'>>;
  filters: Filter[];
  annotations: Array<Omit<Annotation, 'createdAt'> & { createdAt: string }>;
}

export function dataViewToCSV(view: DataView): string {
  const headers = view.columns.map((column) => column.name);
  const lines = [
    headers.map(escapeCSVCell).join(','),
    ...view.rows.map((row) => headers.map((header) => escapeCSVCell(row[header])).join(',')),
  ];
  return lines.join('\n');
}

export function buildChartSpecExport(
  dataset: DataSet,
  activeLayer: LayerConfig | undefined,
  filters: Filter[],
  annotations: Annotation[] = [],
  exportedAt = new Date(),
  layers: LayerConfig[] = activeLayer ? [activeLayer] : [],
  activeLayerIndex: number | null = activeLayer ? 0 : null,
): ChartSpecExport {
  const exportedLayers = layers.map(serializeLayer);
  const validActiveLayerIndex =
    activeLayerIndex !== null && activeLayerIndex >= 0 && activeLayerIndex < exportedLayers.length
      ? activeLayerIndex
      : null;

  return {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    dataset: {
      id: dataset.id,
      name: dataset.name,
      rowCount: dataset.rowCount,
      shape: dataset.shape,
      columns: dataset.columns,
    },
    activeLayer: activeLayer ? serializeActiveLayer(activeLayer) : null,
    activeLayerIndex: validActiveLayerIndex,
    layers: exportedLayers,
    filters,
    annotations: annotations.map((annotation) => ({
      ...annotation,
      createdAt: annotation.createdAt.toISOString(),
    })),
  };
}

function serializeActiveLayer(
  layer: LayerConfig,
): Pick<LayerConfig, 'chartType' | 'columns' | 'options' | 'axis' | 'visible'> {
  return {
    chartType: layer.chartType,
    columns: layer.columns,
    options: layer.options,
    axis: layer.axis,
    visible: layer.visible,
  };
}

function serializeLayer(
  layer: LayerConfig,
): Pick<LayerConfig, 'id' | 'chartType' | 'columns' | 'options' | 'axis' | 'visible'> {
  return {
    id: layer.id,
    ...serializeActiveLayer(layer),
  };
}

export function chartSpecToJSON(spec: ChartSpecExport): string {
  return JSON.stringify(spec, null, 2);
}

export function exportFileName(datasetName: string, suffix: string, extension: string): string {
  const base = datasetName.replace(/\.[^.]+$/, '');
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'dataset'}-${suffix}.${extension}`;
}

function escapeCSVCell(value: unknown): string {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

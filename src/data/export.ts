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
): ChartSpecExport {
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
    activeLayer: activeLayer
      ? {
          chartType: activeLayer.chartType,
          columns: activeLayer.columns,
          options: activeLayer.options,
          axis: activeLayer.axis,
          visible: activeLayer.visible,
        }
      : null,
    filters,
    annotations: annotations.map((annotation) => ({
      ...annotation,
      createdAt: annotation.createdAt.toISOString(),
    })),
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

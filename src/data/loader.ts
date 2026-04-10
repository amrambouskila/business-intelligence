import type { DataSet } from '@/types/data';
import { parseCSVFile } from './parsers/csv-parser';
import { parseJSON } from './parsers/json-parser';
import { analyzeColumns } from './shape-detector';
import { detectShape } from './shape-detector';

/**
 * Load a user-uploaded file into a DataSet.
 * Runs parsing on the main thread for now — we'll move to a Web Worker
 * once the core pipeline is proven.
 */
export async function loadFile(file: File): Promise<DataSet> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rows: Record<string, unknown>[];
  let columnNames: string[];

  if (ext === 'csv' || ext === 'tsv') {
    const result = await parseCSVFile(file);
    rows = result.rows;
    columnNames = result.columnNames;
  } else if (ext === 'json') {
    const text = await file.text();
    const result = parseJSON(text);
    rows = result.rows;
    columnNames = result.columnNames;
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const columns = analyzeColumns(rows, columnNames);
  const shape = detectShape(columns);
  const columnArrays = buildColumnArrays(rows, columnNames);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    rows,
    columnArrays,
    columns,
    rowCount: rows.length,
    shape,
    fileSize: file.size,
    loadedAt: new Date(),
  };
}

function buildColumnArrays(
  rows: Record<string, unknown>[],
  columnNames: string[],
): Record<string, unknown[]> {
  const arrays: Record<string, unknown[]> = {};
  for (const col of columnNames) {
    arrays[col] = rows.map((r) => r[col]);
  }
  return arrays;
}

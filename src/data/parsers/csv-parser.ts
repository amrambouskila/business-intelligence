import Papa from 'papaparse';
import { normalizeParsedRows } from '../normalize-values';

export interface ParseResult {
  rows: Record<string, unknown>[];
  columnNames: string[];
}

export function parseCSV(text: string): ParseResult {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });
  const columnNames = result.meta.fields ?? [];
  return {
    rows: normalizeParsedRows(result.data, columnNames),
    columnNames,
  };
}

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (result) => {
        const columnNames = result.meta.fields ?? [];
        resolve({
          rows: normalizeParsedRows(result.data, columnNames),
          columnNames,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

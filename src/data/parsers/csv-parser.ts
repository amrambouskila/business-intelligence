import Papa from 'papaparse';

export interface ParseResult {
  rows: Record<string, unknown>[];
  columnNames: string[];
}

export function parseCSV(text: string): ParseResult {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return {
    rows: result.data,
    columnNames: result.meta.fields ?? [],
  };
}

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          rows: result.data,
          columnNames: result.meta.fields ?? [],
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

import { readSheet } from 'read-excel-file/browser';
import type { ParseResult } from './csv-parser';

type ExcelCell = string | number | boolean | Date | typeof Date | null;

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const sheet = await readSheet(await file.arrayBuffer());
  return parseExcelSheet(sheet);
}

export function parseExcelSheet(sheet: ExcelCell[][]): ParseResult {
  const headerIndex = sheet.findIndex((row) => row.some((cell) => cell != null && String(cell).trim() !== ''));
  if (headerIndex < 0) return { rows: [], columnNames: [] };

  const header = sheet[headerIndex];
  const columnNames = header.map((cell, index) => headerName(cell, index));

  const rows: Record<string, unknown>[] = [];
  for (const row of sheet.slice(headerIndex + 1)) {
    if (isBlankRow(row)) continue;
    const record: Record<string, unknown> = {};
    for (let index = 0; index < columnNames.length; index += 1) {
      const column = columnNames[index];
      record[column] = cellValue(row[index] ?? null);
    }
    rows.push(record);
  }

  return { rows, columnNames };
}

function headerName(cell: ExcelCell, index: number): string {
  const name = cell == null ? '' : String(cell).trim();
  return name === '' ? `Column ${index + 1}` : name;
}

function isBlankRow(row: ExcelCell[]): boolean {
  return row.every((cell) => cell == null || String(cell).trim() === '');
}

function cellValue(cell: ExcelCell): unknown {
  if (cell instanceof Date) {
    return cell.toISOString();
  }
  return cell;
}

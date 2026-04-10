import type { ParseResult } from './csv-parser';

export function parseJSON(text: string): ParseResult {
  const data = JSON.parse(text);
  const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columnNames };
}

import { parquetReadObjects } from 'hyparquet';
import type { ParseResult } from './csv-parser';

export async function parseParquetFile(file: File): Promise<ParseResult> {
  const rows = await parquetReadObjects({ file: await file.arrayBuffer() });
  return parseParquetRows(rows);
}

export function parseParquetRows(rows: Record<string, unknown>[]): ParseResult {
  const columnNames = parquetColumnNames(rows);
  return {
    columnNames,
    rows: rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const column of columnNames) {
        normalized[column] = parquetValue(row[column]);
      }
      return normalized;
    }),
  };
}

function parquetColumnNames(rows: Record<string, unknown>[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    for (const name of Object.keys(row)) {
      names.add(name);
    }
  }
  return [...names];
}

function parquetValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') {
    return isSafeBigInt(value) ? Number(value) : value.toString();
  }
  return value;
}

function isSafeBigInt(value: bigint): boolean {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER);
}

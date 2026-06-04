import { describe, it, expect } from 'vitest';
import { parquetWriteBuffer } from 'hyparquet-writer';
import { parseParquetFile, parseParquetRows } from '@/data/parsers/parquet-parser';

function parquetFile(buffer: ArrayBuffer): File {
  const file = new File([buffer], 'sample.parquet', { type: 'application/octet-stream' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(buffer),
  });
  return file;
}

describe('parseParquetFile', () => {
  it('parses a real Parquet file into rows and column names', async () => {
    const buffer = parquetWriteBuffer({
      columnData: [
        { name: 'id', data: [1, 2], type: 'INT32' },
        { name: 'value', data: [2, 3], type: 'INT32' },
      ],
      codec: 'UNCOMPRESSED',
    });

    const result = await parseParquetFile(parquetFile(buffer));
    expect(result.columnNames).toEqual(['id', 'value']);
    expect(result.rows).toEqual([
      { id: 1, value: 2 },
      { id: 2, value: 3 },
    ]);
  });
});

describe('parseParquetRows', () => {
  it('unions sparse row keys while preserving first-seen column order', () => {
    const result = parseParquetRows([
      { a: 1, b: 2 },
      { c: 3, a: 4 },
    ]);

    expect(result.columnNames).toEqual(['a', 'b', 'c']);
    expect(result.rows).toEqual([
      { a: 1, b: 2, c: undefined },
      { a: 4, b: undefined, c: 3 },
    ]);
  });

  it('normalizes Date and bigint values for downstream metadata analysis', () => {
    const result = parseParquetRows([
      {
        created_at: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)),
        safe: 123n,
        unsafe: BigInt(Number.MAX_SAFE_INTEGER) + 10n,
      },
    ]);

    expect(result.rows[0]).toEqual({
      created_at: '2026-01-02T03:04:05.000Z',
      safe: 123,
      unsafe: '9007199254741001',
    });
  });

  it('returns no columns for empty Parquet row output', () => {
    expect(parseParquetRows([])).toEqual({ rows: [], columnNames: [] });
  });
});

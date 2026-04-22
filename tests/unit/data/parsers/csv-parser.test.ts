import { describe, it, expect, vi } from 'vitest';
import Papa from 'papaparse';
import { parseCSV, parseCSVFile } from '@/data/parsers/csv-parser';

describe('parseCSV', () => {
  it('parses a header row and rows with dynamic typing', () => {
    const text = 'a,b,c\n1,2.5,hello\n3,4.5,world\n';
    const result = parseCSV(text);
    expect(result.columnNames).toEqual(['a', 'b', 'c']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: 1, b: 2.5, c: 'hello' });
  });

  it('skips empty lines', () => {
    const text = 'a,b\n1,2\n\n3,4\n';
    const result = parseCSV(text);
    expect(result.rows).toHaveLength(2);
  });

  it('returns empty fields array when header is absent', () => {
    const result = parseCSV('');
    expect(result.columnNames).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe('parseCSVFile', () => {
  it('resolves with parsed rows from a File', async () => {
    const file = new File(['a,b\n1,2\n3,4\n'], 'sample.csv', { type: 'text/csv' });
    const result = await parseCSVFile(file);
    expect(result.columnNames).toEqual(['a', 'b']);
    expect(result.rows).toHaveLength(2);
  });

  it('resolves with empty columnNames when PapaParse meta.fields is undefined', async () => {
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    const result = await parseCSVFile(file);
    expect(result.columnNames).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('rejects when PapaParse invokes the error callback', async () => {
    const err = new Error('parse blew up');
    const spy = vi.spyOn(Papa, 'parse').mockImplementation(((
      _input: unknown,
      opts: { error?: (e: Error) => void } = {},
    ) => {
      opts.error?.(err);
    }) as unknown as typeof Papa.parse);
    try {
      const file = new File(['x'], 'any.csv');
      await expect(parseCSVFile(file)).rejects.toThrow('parse blew up');
    } finally {
      spy.mockRestore();
    }
  });

  it('defaults columnNames to [] when PapaParse returns meta without fields', async () => {
    const spy = vi.spyOn(Papa, 'parse').mockImplementation(((
      _input: unknown,
      opts: { complete?: (r: unknown) => void } = {},
    ) => {
      opts.complete?.({ data: [], meta: {} });
    }) as unknown as typeof Papa.parse);
    try {
      const result = await parseCSVFile(new File(['x'], 'm.csv'));
      expect(result.columnNames).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('parseCSV defaults columnNames to [] when meta.fields is absent', () => {
    const spy = vi.spyOn(Papa, 'parse').mockReturnValue({
      data: [],
      meta: {},
      errors: [],
    } as unknown as ReturnType<typeof Papa.parse>);
    try {
      const r = parseCSV('anything');
      expect(r.columnNames).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});

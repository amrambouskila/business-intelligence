import { describe, it, expect, vi } from 'vitest';
import { loadFile } from '@/data/loader';
import { parseExcelFile } from '@/data/parsers/excel-parser';

vi.mock('@/data/parsers/excel-parser', () => ({
  parseExcelFile: vi.fn(),
}));

function makeFile(parts: BlobPart[], name: string, type = ''): File {
  const file = new File(parts, name, { type });
  // jsdom's File does not implement .text(); polyfill just what we need.
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(parts.join('')),
    });
  }
  return file;
}

describe('loadFile', () => {
  it('parses a CSV file into a DataSet with detected shape', async () => {
    const file = makeFile(
      ['x,y\n1,2\n3,4\n5,6\n'],
      'sample.csv',
      'text/csv',
    );
    const ds = await loadFile(file);
    expect(ds.name).toBe('sample.csv');
    expect(ds.rowCount).toBe(3);
    expect(ds.columns.map((c) => c.name)).toEqual(['x', 'y']);
    expect(ds.shape).toBe('two_numeric');
    expect(ds.columnArrays.x).toEqual([1, 3, 5]);
  });

  it('normalizes formatted numeric strings before analysis and column indexing', async () => {
    const file = makeFile(
      ['region,revenue,margin,zip\nEast,"$1,200.50",12%,"00123"\nWest,"$2,400.75",18%,"00456"\n'],
      'formatted.csv',
      'text/csv',
    );
    const ds = await loadFile(file);
    expect(ds.shape).toBe('category_numeric');
    expect(ds.columns.find((c) => c.name === 'revenue')?.type).toBe('float');
    expect(ds.columns.find((c) => c.name === 'margin')?.type).toBe('float');
    expect(ds.columns.find((c) => c.name === 'zip')?.type).toBe('category');
    expect(ds.rows[0]).toMatchObject({ revenue: 1200.5, margin: 0.12, zip: '00123' });
    expect(ds.columnArrays.revenue).toEqual([1200.5, 2400.75]);
  });

  it('normalizes locale numerics and date-like columns before metadata analysis', async () => {
    const file = makeFile(
      ['sale_date,revenue,label\n31/12/2024,"\u20ac 1.234,50",31/12/2024\n13/01/2025,"\u20ac 2.345,75",13/01/2025\n'],
      'localized.csv',
      'text/csv',
    );
    const ds = await loadFile(file);
    expect(ds.shape).toBe('time_series_numeric');
    expect(ds.columns.find((c) => c.name === 'sale_date')?.type).toBe('datetime');
    expect(ds.columns.find((c) => c.name === 'revenue')?.type).toBe('float');
    expect(ds.columns.find((c) => c.name === 'label')?.type).toBe('category');
    expect(ds.rows[0]).toMatchObject({ sale_date: '2024-12-31', revenue: 1234.5, label: '31/12/2024' });
    expect(ds.columnArrays.sale_date).toEqual(['2024-12-31', '2025-01-13']);
    expect(ds.columnArrays.revenue).toEqual([1234.5, 2345.75]);
  });

  it('accepts .tsv extension via the CSV parser', async () => {
    const file = makeFile(['a,b\n1,2\n'], 'data.tsv');
    const ds = await loadFile(file);
    expect(ds.rowCount).toBe(1);
  });

  it('parses a JSON file', async () => {
    const file = makeFile(
      [JSON.stringify([{ n: 1 }, { n: 2 }, { n: 3 }])],
      'rows.json',
      'application/json',
    );
    const ds = await loadFile(file);
    expect(ds.rowCount).toBe(3);
    expect(ds.columns[0].name).toBe('n');
  });

  it('routes Excel workbooks through the spreadsheet parser', async () => {
    vi.mocked(parseExcelFile).mockResolvedValue({
      columnNames: ['date', 'value'],
      rows: [
        { date: '2026-01-01', value: 10 },
        { date: '2026-01-02', value: 12 },
      ],
    });
    const file = new File(['xlsx bytes are owned by the parser test'], 'workbook.xlsx');

    const ds = await loadFile(file);
    expect(parseExcelFile).toHaveBeenCalledWith(file);
    expect(ds.name).toBe('workbook.xlsx');
    expect(ds.rowCount).toBe(2);
    expect(ds.shape).toBe('time_numeric');
    expect(ds.columnArrays.value).toEqual([10, 12]);
  });

  it('accepts macro-enabled Excel workbook extensions through the same parser', async () => {
    vi.mocked(parseExcelFile).mockResolvedValue({
      columnNames: ['category', 'value'],
      rows: [{ category: 'A', value: 2 }, { category: 'B', value: 3 }],
    });
    const file = new File(['xlsm bytes are owned by the parser test'], 'workbook.xlsm');

    const ds = await loadFile(file);
    expect(parseExcelFile).toHaveBeenCalledWith(file);
    expect(ds.shape).toBe('category_numeric');
  });

  it('throws on an unsupported extension', async () => {
    const file = makeFile(['...'], 'mystery.xyz');
    await expect(loadFile(file)).rejects.toThrow(/Unsupported file type/);
  });

  it('throws on a filename with no extension', async () => {
    const file = makeFile(['...'], 'noextension');
    await expect(loadFile(file)).rejects.toThrow(/Unsupported file type/);
  });
});

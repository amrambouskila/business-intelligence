import { describe, it, expect } from 'vitest';
import { loadFile } from '@/data/loader';

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

  it('throws on an unsupported extension', async () => {
    const file = makeFile(['...'], 'mystery.xyz');
    await expect(loadFile(file)).rejects.toThrow(/Unsupported file type/);
  });

  it('throws on a filename with no extension', async () => {
    const file = makeFile(['...'], 'noextension');
    await expect(loadFile(file)).rejects.toThrow(/Unsupported file type/);
  });
});

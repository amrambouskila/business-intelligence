import { describe, it, expect } from 'vitest';
import { parseJSON } from '@/data/parsers/json-parser';

describe('parseJSON', () => {
  it('parses an array of records', () => {
    const text = JSON.stringify([
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ]);
    const result = parseJSON(text);
    expect(result.columnNames).toEqual(['a', 'b']);
    expect(result.rows).toHaveLength(2);
  });

  it('wraps a single object into a one-row dataset', () => {
    const text = JSON.stringify({ foo: 1, bar: 'two' });
    const result = parseJSON(text);
    expect(result.columnNames).toEqual(['foo', 'bar']);
    expect(result.rows).toHaveLength(1);
  });

  it('returns an empty column list for an empty array', () => {
    const result = parseJSON('[]');
    expect(result.rows).toEqual([]);
    expect(result.columnNames).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJSON('{not valid')).toThrow();
  });
});

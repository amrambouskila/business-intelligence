import { describe, expect, it } from 'vitest';
import { normalizeParsedRows, normalizeParsedValue } from '@/data/normalize-values';

describe('normalizeParsedValue', () => {
  it('leaves non-string and blank values unchanged', () => {
    expect(normalizeParsedValue(12)).toBe(12);
    expect(normalizeParsedValue(null)).toBeNull();
    expect(normalizeParsedValue('   ')).toBe('   ');
  });

  it('parses currency, thousands separators, signs, parentheses, and percentages', () => {
    expect(normalizeParsedValue('$1,234.50')).toBe(1234.5);
    expect(normalizeParsedValue('\u20ac 2,000')).toBe(2000);
    expect(normalizeParsedValue('300\u00a3')).toBe(300);
    expect(normalizeParsedValue('-$1,250')).toBe(-1250);
    expect(normalizeParsedValue('+\u00a54,500')).toBe(4500);
    expect(normalizeParsedValue('(1,234.25)')).toBe(-1234.25);
    expect(normalizeParsedValue('12.5%')).toBe(0.125);
  });

  it('parses locale-style decimal and grouping separators', () => {
    expect(normalizeParsedValue('\u20ac 1.234,50')).toBe(1234.5);
    expect(normalizeParsedValue('1.234')).toBe(1234);
    expect(normalizeParsedValue('1234.5')).toBe(1234.5);
    expect(normalizeParsedValue('1 234,50 \u20ac')).toBe(1234.5);
    expect(normalizeParsedValue("1'234.50")).toBe(1234.5);
    expect(normalizeParsedValue('1\u2019234.50')).toBe(1234.5);
    expect(normalizeParsedValue('12,5%')).toBe(0.125);
    expect(normalizeParsedValue('(1.234,25)')).toBe(-1234.25);
  });

  it('normalizes unambiguous date-like column values to ISO dates', () => {
    expect(normalizeParsedValue('31/12/2024', 'sale_date')).toBe('2024-12-31');
    expect(normalizeParsedValue('12/31/2024', 'created_at')).toBe('2024-12-31');
    expect(normalizeParsedValue('31.12.2024', 'updated')).toBe('2024-12-31');
    expect(normalizeParsedValue('2024/12/31', 'timestamp')).toBe('2024-12-31');
    expect(normalizeParsedValue('31 Dec 24', 'start')).toBe('2024-12-31');
    expect(normalizeParsedValue('December 31, 2024', 'finish')).toBe('2024-12-31');
  });

  it('leaves non-numeric and code-like strings unchanged', () => {
    expect(normalizeParsedValue('001,23')).toBe('001,23');
    expect(normalizeParsedValue('1.2.3')).toBe('1.2.3');
    expect(normalizeParsedValue('12._')).toBe('12._');
    expect(normalizeParsedValue('12.,')).toBe('12.,');
    expect(normalizeParsedValue('12kg')).toBe('12kg');
    expect(normalizeParsedValue('00123')).toBe('00123');
    expect(normalizeParsedValue(`${'9'.repeat(400)}.0`)).toBe(`${'9'.repeat(400)}.0`);
    expect(normalizeParsedValue('$')).toBe('$');
  });

  it('leaves ambiguous or non-date-column date strings unchanged', () => {
    expect(normalizeParsedValue('03/04/2024', 'sale_date')).toBe('03/04/2024');
    expect(normalizeParsedValue('31/12/2024', 'label')).toBe('31/12/2024');
    expect(normalizeParsedValue('31 Foo 2024', 'sale_date')).toBe('31 Foo 2024');
    expect(normalizeParsedValue('Foo 31 2024', 'sale_date')).toBe('Foo 31 2024');
    expect(normalizeParsedValue('0000-12-31', 'sale_date')).toBe('0000-12-31');
    expect(normalizeParsedValue('2024-00-31', 'sale_date')).toBe('2024-00-31');
    expect(normalizeParsedValue('2024-13-31', 'sale_date')).toBe('2024-13-31');
    expect(normalizeParsedValue('2024-12-32', 'sale_date')).toBe('2024-12-32');
    expect(normalizeParsedValue('31/02/2024', 'sale_date')).toBe('31/02/2024');
  });
});

describe('normalizeParsedRows', () => {
  it('normalizes declared columns while preserving extra row fields', () => {
    const rows = normalizeParsedRows(
      [
        { amount: '$1,200', rate: '10%', code: '001', untouched: '$9' },
        { amount: '2,400', rate: '25%', code: '002', untouched: '$8' },
      ],
      ['amount', 'rate', 'code'],
    );

    expect(rows).toEqual([
      { amount: 1200, rate: 0.1, code: '001', untouched: '$9' },
      { amount: 2400, rate: 0.25, code: '002', untouched: '$8' },
    ]);
  });

  it('normalizes date-like declared columns but not unrelated text fields', () => {
    const rows = normalizeParsedRows(
      [{ sale_date: '31/12/2024', label: '31/12/2024' }],
      ['sale_date', 'label'],
    );

    expect(rows).toEqual([{ sale_date: '2024-12-31', label: '31/12/2024' }]);
  });
});

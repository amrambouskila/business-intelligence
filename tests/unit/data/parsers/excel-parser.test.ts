// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import { parseExcelFile, parseExcelSheet } from '@/data/parsers/excel-parser';

type Cell = string | number | boolean | null;

Object.defineProperty(globalThis, 'DOMParser', {
  value: DOMParser,
  configurable: true,
});

function workbook(rows: Cell[][]): File {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml(rows)),
  };
  const bytes = zipSync(files);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const file = new File([buffer], 'sample.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(buffer),
  });
  return file;
}

function sheetXml(rows: Cell[][]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, colIndex) => cellXml(cell, rowIndex, colIndex)).join('')}</row>`).join('')}
  </sheetData>
</worksheet>`;
}

function cellXml(cell: Cell, rowIndex: number, colIndex: number): string {
  if (cell == null) return '';
  const ref = `${columnName(colIndex)}${rowIndex + 1}`;
  if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`;
  if (typeof cell === 'boolean') return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
}

function columnName(index: number): string {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

describe('parseExcelFile', () => {
  it('parses the first non-empty row as headers and skips blank data rows', async () => {
    const result = await parseExcelFile(workbook([
      [null, null, null],
      ['region', 'revenue', 'active'],
      ['East', 1200.5, true],
      [null, null, null],
      ['West', 2400, false],
    ]));

    expect(result.columnNames).toEqual(['region', 'revenue', 'active']);
    expect(result.rows).toEqual([
      { region: 'East', revenue: 1200.5, active: true },
      { region: 'West', revenue: 2400, active: false },
    ]);
  });

  it('generates stable names for blank header cells', async () => {
    const result = await parseExcelFile(workbook([
      ['category', null, 'value'],
      ['A', 'fallback', 10],
    ]));

    expect(result.columnNames).toEqual(['category', 'Column 2', 'value']);
    expect(result.rows[0]).toEqual({ category: 'A', 'Column 2': 'fallback', value: 10 });
  });

  it('returns an empty parse result for an empty workbook', async () => {
    const result = await parseExcelFile(workbook([]));
    expect(result).toEqual({ rows: [], columnNames: [] });
  });

  it('normalizes Date cell objects to ISO strings before loader normalization', () => {
    const result = parseExcelSheet([
      ['created_at', 'value'],
      [new Date(Date.UTC(2026, 0, 2, 3, 4, 5)), 10],
    ]);

    expect(result).toEqual({
      columnNames: ['created_at', 'value'],
      rows: [{ created_at: '2026-01-02T03:04:05.000Z', value: 10 }],
    });
  });

  it('fills missing trailing cells with null values', () => {
    const result = parseExcelSheet([
      ['category', 'value'],
      ['A'],
    ]);

    expect(result.rows).toEqual([{ category: 'A', value: null }]);
  });
});

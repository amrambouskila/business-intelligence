import type { DataSet } from '@/types/data';
import { analyzeColumns, detectShape } from './shape-detector';

/** Generate a sample stock/financial dataset. */
function generateStockData(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let price = 150;
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer'];
  const ratings = ['Buy', 'Hold', 'Sell'];
  const start = new Date('2024-01-02');

  for (let i = 0; i < 252; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (Math.random() - 0.48) * 4;
    const open = price + (Math.random() - 0.5);
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(1_000_000 + Math.random() * 7_000_000);
    price = close;

    rows.push({
      Date: date.toISOString().split('T')[0],
      Open: +open.toFixed(2),
      High: +high.toFixed(2),
      Low: +low.toFixed(2),
      Close: +close.toFixed(2),
      Volume: volume,
      Daily_Return: +(change / open * 100).toFixed(4),
      Sector: sectors[Math.floor(Math.random() * sectors.length)],
      Rating: ratings[Math.floor(Math.random() * ratings.length)],
      PE_Ratio: +(15 + (Math.random() - 0.5) * 10).toFixed(2),
      Sentiment: +(Math.random() * 2 - 1).toFixed(4),
      Trade_Size: Math.floor(Math.exp(8 + Math.random() * 3)),
    });
  }
  return rows;
}

/** Generate a simple numeric dataset for distribution/scatter charts. */
function generateNumericData(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    // Box-Muller for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const normal2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    rows.push({
      x: +(normal * 10 + 50).toFixed(2),
      y: +(normal * 5 + normal2 * 3 + 30).toFixed(2),
      z: +(Math.random() * 100).toFixed(2),
      group: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
      value: +(Math.exp(normal + 5)).toFixed(2),
    });
  }
  return rows;
}

export type SampleKey = 'stock' | 'numeric';

const SAMPLES: Record<SampleKey, { name: string; generate: () => Record<string, unknown>[] }> = {
  stock: { name: 'Stock Market (OHLCV + categories)', generate: generateStockData },
  numeric: { name: 'Numeric (distributions + scatter)', generate: generateNumericData },
};

export function getSampleOptions(): { label: string; value: SampleKey }[] {
  return Object.entries(SAMPLES).map(([key, { name }]) => ({
    label: name,
    value: key as SampleKey,
  }));
}

export function loadSampleData(key: SampleKey): DataSet {
  const { generate } = SAMPLES[key];
  const rows = generate();
  /* v8 ignore next */
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns = analyzeColumns(rows, columnNames);
  const shape = detectShape(columns);

  const columnArrays: Record<string, unknown[]> = {};
  for (const col of columnNames) {
    columnArrays[col] = rows.map((r) => r[col]);
  }

  return {
    id: crypto.randomUUID(),
    name: `sample_${key}.csv`,
    rows,
    columnArrays,
    columns,
    rowCount: rows.length,
    shape,
    fileSize: JSON.stringify(rows).length,
    loadedAt: new Date(),
  };
}

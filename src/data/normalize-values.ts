const CURRENCY = '$\u20ac\u00a3\u00a5';
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function normalizeParsedRows(
  rows: Record<string, unknown>[],
  columnNames: string[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = { ...row };
    for (const column of columnNames) {
      normalized[column] = normalizeParsedValue(row[column], column);
    }
    return normalized;
  });
}

export function normalizeParsedValue(value: unknown, columnName = ''): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return value;

  const numeric = parseFormattedNumber(trimmed);
  if (numeric != null) return numeric;

  if (isDateLikeColumn(columnName)) {
    const date = parseFormattedDate(trimmed);
    if (date != null) return date;
  }

  return value;
}

function parseFormattedNumber(value: string): number | undefined {
  let text = value;
  let sign = 1;

  const parenthesized = text.match(/^\((.*)\)$/);
  if (parenthesized) {
    sign = -1;
    text = parenthesized[1].trim();
  }

  if (text.startsWith('-') || text.startsWith('+')) {
    sign *= text.startsWith('-') ? -1 : 1;
    text = text.slice(1).trim();
  }

  text = stripCurrency(text);

  let percent = false;
  if (text.endsWith('%')) {
    percent = true;
    text = text.slice(0, -1).trim();
  }

  text = text.replace(/[\s\u00a0\u202f]/g, '');
  if (text === '' || /[A-Za-z]/.test(text)) return undefined;

  const numericParts = splitLocalizedNumber(text);
  if (numericParts == null) return undefined;

  const { integerPart, fractionPart } = numericParts;
  const normalizedInteger = normalizeIntegerPart(integerPart);
  if (normalizedInteger == null) return undefined;
  if (fractionPart != null && !/^\d+$/.test(fractionPart)) return undefined;

  // Preserve code-like strings such as ZIP codes or SKU IDs.
  if (/^0\d+/.test(normalizedInteger)) return undefined;

  const normalized = fractionPart == null ? normalizedInteger : `${normalizedInteger}.${fractionPart}`;
  const parsed = Number(normalized) * sign;
  if (!Number.isFinite(parsed)) return undefined;
  return percent ? parsed / 100 : parsed;
}

function stripCurrency(value: string): string {
  let text = value.trim();
  if (text.length > 0 && CURRENCY.includes(text[0])) {
    text = text.slice(1).trim();
  }
  if (text.length > 0 && CURRENCY.includes(text[text.length - 1])) {
    text = text.slice(0, -1).trim();
  }
  return text;
}

function normalizeIntegerPart(value: string): string | undefined {
  if (/^\d{1,3}(,\d{3})+$/.test(value)) return value.replace(/,/g, '');
  if (/^\d{1,3}([.'\u2019]\d{3})+$/.test(value)) return value.replace(/[.'\u2019]/g, '');
  if (/^\d+$/.test(value)) return value;
  return undefined;
}

function splitLocalizedNumber(value: string): { integerPart: string; fractionPart?: string } | undefined {
  const decimal = decimalSeparator(value);
  if (decimal == null) return { integerPart: value };

  const parts = value.split(decimal);
  if (parts.length !== 2) return undefined;

  const [integerPart, fractionPart] = parts;
  if (integerPart === '' || fractionPart === '') return undefined;
  return { integerPart, fractionPart };
}

function decimalSeparator(value: string): '.' | ',' | undefined {
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    return lastDot > lastComma ? '.' : ',';
  }

  if (lastDot >= 0) {
    const digitsAfter = value.length - lastDot - 1;
    const looksLikeThousands = /^\d{1,3}(\.\d{3})+$/.test(value);
    return looksLikeThousands && digitsAfter === 3 ? undefined : '.';
  }

  if (lastComma >= 0) {
    const digitsAfter = value.length - lastComma - 1;
    const looksLikeThousands = /^\d{1,3}(,\d{3})+$/.test(value);
    return looksLikeThousands && digitsAfter === 3 ? undefined : ',';
  }

  return undefined;
}

function isDateLikeColumn(name: string): boolean {
  return /(date|time|timestamp|datetime|created|updated|start|end|begin|finish)/i.test(name);
}

function parseFormattedDate(value: string): string | undefined {
  const text = value.trim();
  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) return formatDateParts(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

  const delimited = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (delimited) {
    const first = Number(delimited[1]);
    const second = Number(delimited[2]);
    const year = normalizeYear(Number(delimited[3]));
    if (first > 12) return formatDateParts(year, second, first);
    if (second > 12) return formatDateParts(year, first, second);
  }

  const dayMonthName = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2}|\d{4})$/);
  if (dayMonthName) {
    const month = MONTHS[dayMonthName[2].toLowerCase()];
    if (month != null) return formatDateParts(normalizeYear(Number(dayMonthName[3])), month, Number(dayMonthName[1]));
  }

  const monthNameDay = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2}|\d{4})$/);
  if (monthNameDay) {
    const month = MONTHS[monthNameDay[1].toLowerCase()];
    if (month != null) return formatDateParts(normalizeYear(Number(monthNameDay[3])), month, Number(monthNameDay[2]));
  }

  return undefined;
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function formatDateParts(year: number, month: number, day: number): string | undefined {
  if (!isValidDateParts(year, month, day)) return undefined;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

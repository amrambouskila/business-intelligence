export type MatrixCell = [number, number, number];

export type MatrixGrid = {
  rowCategories: string[];
  colCategories: string[];
  cells: MatrixCell[];
  finiteValues: number[];
  min: number;
  max: number;
};

function finiteRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  return {
    min: values.reduce((a, b) => (a < b ? a : b), Infinity),
    max: values.reduce((a, b) => (a > b ? a : b), -Infinity),
  };
}

export function buildMatrixGrid(rows: unknown[], cols: unknown[], values: unknown[]): MatrixGrid {
  const n = Math.min(rows.length, cols.length, values.length);
  const rowData = rows.slice(0, n).map(String);
  const colData = cols.slice(0, n).map(String);
  const rowCategories = [...new Set(rowData)];
  const colCategories = [...new Set(colData)];
  const rowIndex = new Map(rowCategories.map((row, i) => [row, i]));
  const colIndex = new Map(colCategories.map((col, i) => [col, i]));
  const cells: MatrixCell[] = [];
  const finiteValues: number[] = [];

  for (let i = 0; i < n; i++) {
    const value = values[i];
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : NaN;
    cells.push([colIndex.get(colData[i])!, rowIndex.get(rowData[i])!, numeric]);
    if (Number.isFinite(numeric)) finiteValues.push(numeric);
  }

  return { rowCategories, colCategories, cells, finiteValues, ...finiteRange(finiteValues) };
}

export function reorderMatrixGrid(
  grid: MatrixGrid,
  rowOrder: string[],
  colOrder: string[],
): MatrixGrid {
  const rowMap = new Map(grid.rowCategories.map((row, i) => [i, row]));
  const colMap = new Map(grid.colCategories.map((col, i) => [i, col]));
  const orderedRows = rowOrder.filter((row) => grid.rowCategories.includes(row));
  const orderedCols = colOrder.filter((col) => grid.colCategories.includes(col));
  const rowIndex = new Map(orderedRows.map((row, i) => [row, i]));
  const colIndex = new Map(orderedCols.map((col, i) => [col, i]));

  const cells = grid.cells
    .map(([col, row, value]): MatrixCell | null => {
      const rowName = rowMap.get(row);
      const colName = colMap.get(col);
      if (rowName == null || colName == null) return null;
      const nextRow = rowIndex.get(rowName);
      const nextCol = colIndex.get(colName);
      if (nextRow == null || nextCol == null) return null;
      return [nextCol, nextRow, value];
    })
    .filter((cell): cell is MatrixCell => cell != null);

  return {
    rowCategories: orderedRows,
    colCategories: orderedCols,
    cells,
    finiteValues: [...grid.finiteValues],
    min: grid.min,
    max: grid.max,
  };
}

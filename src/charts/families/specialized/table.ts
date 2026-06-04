import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataShape, DataView } from '@/types/data';

type GraphicChild = Record<string, unknown>;

const TABLE_SHAPES: DataShape[] = [
  'single_numeric',
  'category_numeric',
  'time_numeric',
  'time_series_numeric',
  'two_numeric',
  'three_numeric',
  'many_numeric',
  'matrix',
  'hierarchy',
  'nodes_edges',
  'source_target_value',
  'geo_points',
  'geo_polygons',
  'intervals',
  'ohlcv',
  'survival',
  'event_log',
  'generic',
];

function displayColumns(data: DataView): string[] {
  return data.columns.map((column) => column.name).slice(0, 6);
}

function formatCell(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value == null ? '' : String(value);
}

class TableRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView): boolean {
    return data.rowCount === 0 || data.columns.length === 0;
  }

  protected emptyMessage(): string {
    return 'No table rows to display';
  }

  buildOption(data: DataView, _config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const columns = displayColumns(data);
    const rows = data.rows.slice(0, 9);
    const rowHeight = 28;
    const colWidth = 118;
    const children: GraphicChild[] = columns.flatMap((column, colIndex) => [
      {
        type: 'rect',
        shape: { x: colIndex * colWidth, y: 0, width: colWidth, height: rowHeight },
        style: { fill: theme.gridColor, stroke: theme.background, lineWidth: 1 },
      },
      {
        type: 'text',
        x: colIndex * colWidth + 8,
        y: 8,
        style: {
          text: column,
          fill: theme.foreground,
          font: `600 ${theme.fontSize.small}px ${theme.fontFamily}`,
          width: colWidth - 14,
          overflow: 'truncate',
        },
      },
    ]);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex];
        const y = (rowIndex + 1) * rowHeight;
        children.push(
          {
            type: 'line',
            shape: { x1: colIndex * colWidth, y1: y + rowHeight, x2: (colIndex + 1) * colWidth, y2: y + rowHeight },
            style: { stroke: theme.gridColor, lineWidth: 1 },
          },
          {
            type: 'text',
            x: colIndex * colWidth + 8,
            y: y + 8,
            style: {
              text: formatCell(rows[rowIndex][column]),
              fill: theme.axisColor,
              font: `${theme.fontSize.small}px ${theme.fontFamily}`,
              width: colWidth - 14,
              overflow: 'truncate',
            },
          },
        );
      }
    }

    return {
      graphic: [{
        type: 'group',
        left: 24,
        top: 24,
        children,
      }],
    };
  }
}

chartRegistry.register({
  type: 'table',
  family: 'specialized',
  name: 'Table',
  description: 'Raw or summarized rows displayed as a compact table',
  renderer: 'echarts',
  compatibleShapes: TABLE_SHAPES,
  requiredColumns: [],
  createRenderer: () => new TableRenderer(),
});

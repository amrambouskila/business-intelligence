import { describe, expect, it } from 'vitest';
import { buildChartSpecExport, chartSpecToJSON, dataViewToCSV, exportFileName } from '@/data/export';
import type { DataSet, DataView, Filter } from '@/types/data';
import type { LayerConfig } from '@/stores/chart-store';

const columns: DataSet['columns'] = [
  { name: 'name', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
  { name: 'value', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
  { name: 'note', type: 'text', nullable: true, uniqueCount: 2, nullCount: 1 },
  { name: 'when', type: 'datetime', nullable: false, uniqueCount: 2, nullCount: 0 },
];

function view(): DataView {
  return {
    sourceId: 'ds1',
    rows: [
      { name: 'A', value: 10, note: 'plain', when: new Date('2024-01-01T00:00:00Z') },
      { name: 'B, quoted', value: 20, note: 'line\n"two"', when: '2024-01-02' },
      { name: 'C', value: 30, note: null, when: '2024-01-03' },
    ],
    columnArrays: {},
    columns,
    rowCount: 3,
    filters: [],
  };
}

function dataset(): DataSet {
  return {
    id: 'ds1',
    name: 'Sales Data.csv',
    rows: [],
    columnArrays: {},
    columns,
    rowCount: 3,
    shape: 'category_numeric',
    fileSize: 1024,
    loadedAt: new Date('2024-01-01T00:00:00Z'),
  };
}

describe('data export helpers', () => {
  it('serializes a filtered data view as escaped CSV', () => {
    expect(dataViewToCSV(view())).toBe([
      'name,value,note,when',
      'A,10,plain,2024-01-01T00:00:00.000Z',
      '"B, quoted",20,"line\n""two""",2024-01-02',
      'C,30,,2024-01-03',
    ].join('\n'));
  });

  it('serializes empty views with a header row', () => {
    expect(dataViewToCSV({ ...view(), rows: [], rowCount: 0 })).toBe('name,value,note,when');
  });

  it('builds a stable chart spec payload with active layer, layer stack, and filters', () => {
    const layer: LayerConfig = {
      id: 'layer-1',
      chartType: 'bar',
      columns: { category: 'name', value: 'value' },
      options: { stacked: false },
      axis: 'y1',
      visible: true,
    };
    const hiddenLayer: LayerConfig = {
      id: 'layer-2',
      chartType: 'line',
      columns: { date: 'name', value: 'value' },
      options: { smooth: true },
      axis: 'y2',
      visible: false,
    };
    const filters: Filter[] = [{ id: 'filter-1', column: 'value', op: 'gt', value: 10, active: true }];
    const annotations = [{
      id: 'ann-1',
      datasetId: 'ds1',
      dataPointIndex: 1,
      text: 'check outlier',
      createdAt: new Date('2024-02-01T00:00:00Z'),
    }];
    const exportedAnnotations = [{ ...annotations[0], createdAt: '2024-02-01T00:00:00.000Z' }];
    const spec = buildChartSpecExport(
      dataset(),
      layer,
      filters,
      annotations,
      new Date('2024-02-03T04:05:06Z'),
      [layer, hiddenLayer],
      0,
    );

    expect(spec).toMatchObject({
      version: 1,
      exportedAt: '2024-02-03T04:05:06.000Z',
      dataset: { id: 'ds1', name: 'Sales Data.csv', rowCount: 3, shape: 'category_numeric' },
      activeLayer: { chartType: 'bar', columns: { category: 'name', value: 'value' }, options: { stacked: false } },
      activeLayerIndex: 0,
      layers: [
        {
          id: 'layer-1',
          chartType: 'bar',
          columns: { category: 'name', value: 'value' },
          options: { stacked: false },
          axis: 'y1',
          visible: true,
        },
        {
          id: 'layer-2',
          chartType: 'line',
          columns: { date: 'name', value: 'value' },
          options: { smooth: true },
          axis: 'y2',
          visible: false,
        },
      ],
      filters,
      annotations: exportedAnnotations,
    });
    expect(JSON.parse(chartSpecToJSON(spec))).toEqual(spec);
  });

  it('supports chart specs without an active layer', () => {
    expect(buildChartSpecExport(dataset(), undefined, [])).toMatchObject({
      activeLayer: null,
      activeLayerIndex: null,
      layers: [],
    });
  });

  it('defaults the layer stack to the active layer for legacy callers', () => {
    const layer: LayerConfig = {
      id: 'layer-1',
      chartType: 'bar',
      columns: { category: 'name', value: 'value' },
      options: {},
      axis: 'y1',
      visible: true,
    };
    expect(buildChartSpecExport(dataset(), layer, [])).toMatchObject({
      activeLayer: { chartType: 'bar' },
      activeLayerIndex: 0,
      layers: [{ id: 'layer-1', chartType: 'bar' }],
    });
  });

  it('drops invalid active layer indexes from chart specs', () => {
    const layer: LayerConfig = {
      id: 'layer-1',
      chartType: 'bar',
      columns: { category: 'name', value: 'value' },
      options: {},
      axis: 'y1',
      visible: true,
    };
    expect(buildChartSpecExport(dataset(), undefined, [], [], new Date('2024-01-01T00:00:00Z'), [layer], 4)).toMatchObject({
      activeLayer: null,
      activeLayerIndex: null,
      layers: [{ id: 'layer-1', chartType: 'bar' }],
    });
  });

  it('generates safe export filenames', () => {
    expect(exportFileName('Sales Data.csv', 'filtered', 'csv')).toBe('sales-data-filtered.csv');
    expect(exportFileName('...csv', 'chart-spec', 'json')).toBe('dataset-chart-spec.json');
  });
});

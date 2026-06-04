import { Database, BarChart3, Layers, Palette, Download, MessageSquare } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { SidebarTab } from '@/stores/ui-store';
import { useActiveDataset, useDatasetStore } from '@/stores/dataset-store';
import { useChartStore } from '@/stores/chart-store';
import { useFilterStore } from '@/stores/filter-store';
import { ChartPicker } from './ChartPicker';
import { ChartOptionsPanel } from './ChartOptionsPanel';
import { formatBytes } from '@/lib/formatBytes';
import { formatNumber } from '@/lib/formatNumber';
import { useState } from 'react';
import type { Filter } from '@/types/data';
import { applyFilters } from '@/data/transforms';
import { buildChartSpecExport, chartSpecToJSON, dataViewToCSV, exportFileName } from '@/data/export';
import { downloadTextFile } from '@/lib/downloadTextFile';
import { useAnnotationStore } from '@/stores/annotation-store';

const TABS: { key: SidebarTab; icon: typeof Database; label: string }[] = [
  { key: 'data', icon: Database, label: 'Data' },
  { key: 'charts', icon: BarChart3, label: 'Charts' },
  { key: 'layers', icon: Layers, label: 'Layers' },
  { key: 'style', icon: Palette, label: 'Style' },
];

export function Sidebar() {
  const tab = useUIStore((s) => s.sidebarTab);
  const setTab = useUIStore((s) => s.setSidebarTab);

  return (
    <aside
      className="flex flex-col w-64 shrink-0 border-r h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors"
            style={{
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            title={label}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'data' && <DataTab />}
        {tab === 'charts' && <ChartPicker />}
        {tab === 'layers' && <LayersTab />}
        {tab === 'style' && <StyleTab />}
      </div>
    </aside>
  );
}

function DataTab() {
  const ds = useActiveDataset();
  const datasetMap = useDatasetStore((s) => s.datasets);
  const activeDatasetId = useDatasetStore((s) => s.activeDatasetId);
  const setActive = useDatasetStore((s) => s.setActive);
  const filters = useFilterStore((s) => s.filters);
  const addFilter = useFilterStore((s) => s.addFilter);
  const removeFilter = useFilterStore((s) => s.removeFilter);
  const toggleFilter = useFilterStore((s) => s.toggleFilter);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const layers = useChartStore((s) => s.layers);
  const activeLayerIndex = useChartStore((s) => s.activeLayerIndex);
  const annotations = useAnnotationStore((s) => s.annotations);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const removeAnnotation = useAnnotationStore((s) => s.removeAnnotation);
  const clearAnnotations = useAnnotationStore((s) => s.clearAnnotations);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOp, setFilterOp] = useState<Filter['op']>('eq');
  const [filterValue, setFilterValue] = useState('');
  const [annotationIndex, setAnnotationIndex] = useState('0');
  const [annotationText, setAnnotationText] = useState('');

  if (!ds) {
    return (
      <div className="text-center py-8">
        <Database size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Upload a file to get started
        </p>
      </div>
    );
  }

  const activeDataset = ds;
  const datasets = Array.from(datasetMap.values());
  const selectedFilterColumn = activeDataset.columns.some((col) => col.name === filterColumn)
    ? filterColumn
    : (activeDataset.columns[0]?.name ?? '');
  const previewColumns = activeDataset.columns.slice(0, 6);
  const previewRows = activeDataset.rows.slice(0, 5);
  const canAddFilter = selectedFilterColumn.length > 0 && filterValue.trim().length > 0;
  const activeLayer = layers[activeLayerIndex];
  const activeAnnotations = annotations.filter((annotation) => annotation.datasetId === activeDataset.id);
  const parsedAnnotationIndex = Number(annotationIndex);
  const canAddAnnotation =
    Number.isInteger(parsedAnnotationIndex) &&
    parsedAnnotationIndex >= 0 &&
    parsedAnnotationIndex < activeDataset.rowCount &&
    annotationText.trim().length > 0;

  function parsedFilterValue(): unknown {
    if (['gt', 'gte', 'lt', 'lte'].includes(filterOp)) {
      const numeric = Number(filterValue);
      return Number.isFinite(numeric) ? numeric : filterValue;
    }
    return filterValue;
  }

  function handleAddFilter() {
    addFilter({ column: selectedFilterColumn, op: filterOp, value: parsedFilterValue() });
    setFilterValue('');
  }

  function handleAddAnnotation() {
    addAnnotation({
      datasetId: activeDataset.id,
      dataPointIndex: parsedAnnotationIndex,
      text: annotationText.trim(),
    });
    setAnnotationText('');
  }

  function handleExportCSV() {
    const view = applyFilters(activeDataset, filters);
    downloadTextFile(
      exportFileName(activeDataset.name, 'filtered', 'csv'),
      dataViewToCSV(view),
      'text/csv;charset=utf-8',
    );
  }

  function handleExportSpec() {
    downloadTextFile(
      exportFileName(activeDataset.name, 'chart-spec', 'json'),
      chartSpecToJSON(buildChartSpecExport(activeDataset, activeLayer, filters, activeAnnotations)),
      'application/json;charset=utf-8',
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold mb-1">{activeDataset.name}</h3>
        <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>{formatNumber(activeDataset.rowCount, 0)} rows</span>
          <span>{activeDataset.columns.length} cols</span>
          <span>{formatBytes(activeDataset.fileSize)}</span>
        </div>
        <div
          className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium inline-block"
          style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
        >
          {activeDataset.shape.replace(/_/g, ' ')}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Annotations
        </h4>
        <div className="flex flex-col gap-1">
          <input
            aria-label="Annotation row index"
            type="number"
            min={0}
            max={Math.max(0, activeDataset.rowCount - 1)}
            value={annotationIndex}
            onChange={(event) => setAnnotationIndex(event.target.value)}
            className="rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          <input
            aria-label="Annotation text"
            value={annotationText}
            onChange={(event) => setAnnotationText(event.target.value)}
            className="rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          <button
            type="button"
            disabled={!canAddAnnotation}
            onClick={canAddAnnotation ? handleAddAnnotation : undefined}
            className="flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium"
            style={{
              background: canAddAnnotation ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: canAddAnnotation ? 'var(--bg-primary)' : 'var(--text-muted)',
            }}
          >
            <MessageSquare size={12} />
            Add note
          </button>
        </div>
        {activeAnnotations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {activeAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="flex items-center justify-between gap-1 rounded px-2 py-1 text-[10px]"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <span className="truncate">
                  Row {annotation.dataPointIndex}: {annotation.text}
                </span>
                <button type="button" onClick={() => removeAnnotation(annotation.id)} style={{ color: 'var(--danger)' }}>
                  remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => clearAnnotations(activeDataset.id)}
              className="text-left text-[10px]"
              style={{ color: 'var(--danger)' }}
            >
              Clear annotations
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Export
        </h4>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <Download size={12} />
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportSpec}
            className="flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <Download size={12} />
            Spec
          </button>
        </div>
      </div>

      {datasets.length > 1 && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Dataset</span>
          <select
            aria-label="Active dataset"
            value={activeDatasetId!}
            onChange={(event) => setActive(event.target.value)}
            className="w-full rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
            ))}
          </select>
        </label>
      )}

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Preview
        </h4>
        {previewRows.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No rows to preview</p>
        ) : (
          <div className="overflow-x-auto rounded" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-[10px]">
              <thead style={{ background: 'var(--bg-tertiary)' }}>
                <tr>
                  {previewColumns.map((col) => (
                    <th key={col.name} className="px-2 py-1 text-left font-semibold">{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} style={{ borderTop: '1px solid var(--border)' }}>
                    {previewColumns.map((col) => (
                      <td key={col.name} className="px-2 py-1 max-w-24 truncate">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Filters
        </h4>
        <div className="flex flex-col gap-1">
          <select
            aria-label="Filter column"
            value={selectedFilterColumn}
            onChange={(event) => setFilterColumn(event.target.value)}
            className="rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {activeDataset.columns.map((col) => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter operator"
            value={filterOp}
            onChange={(event) => setFilterOp(event.target.value as Filter['op'])}
            className="rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value="eq">equals</option>
            <option value="neq">not equal</option>
            <option value="gt">greater than</option>
            <option value="gte">greater or equal</option>
            <option value="lt">less than</option>
            <option value="lte">less or equal</option>
            <option value="regex">matches regex</option>
          </select>
          <input
            aria-label="Filter value"
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            className="rounded px-2 py-1 text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          <button
            type="button"
            disabled={!canAddFilter}
            onClick={canAddFilter ? handleAddFilter : undefined}
            className="rounded px-2 py-1 text-xs font-medium"
            style={{
              background: canAddFilter ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: canAddFilter ? 'var(--bg-primary)' : 'var(--text-muted)',
            }}
          >
            Add filter
          </button>
        </div>

        {filters.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center justify-between gap-1 rounded px-2 py-1 text-[10px]"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <button
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className="truncate text-left"
                  style={{ color: filter.active ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {filter.column} {filter.op} {String(filter.value)}
                </button>
                <button type="button" onClick={() => removeFilter(filter.id)} style={{ color: 'var(--danger)' }}>
                  remove
                </button>
              </div>
            ))}
            <button type="button" onClick={clearFilters} className="text-left text-[10px]" style={{ color: 'var(--danger)' }}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Columns
        </h4>
        <div className="flex flex-col gap-1">
          {activeDataset.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between px-2 py-1 rounded text-xs"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayersTab() {
  const layers = useChartStore((s) => s.layers);
  const activeLayerIndex = useChartStore((s) => s.activeLayerIndex);
  const setActiveLayer = useChartStore((s) => s.setActiveLayer);
  const removeLayer = useChartStore((s) => s.removeLayer);

  if (layers.length === 0) {
    return (
      <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
        Pick a chart type to add a layer
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
          style={{
            background: activeLayerIndex === i ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--text-primary)',
          }}
        >
          <button type="button" onClick={() => setActiveLayer(i)} className="truncate text-left">
            {layer.chartType}
          </button>
          <button
            onClick={() => removeLayer(i)}
            className="text-[10px] px-1 rounded"
            style={{ color: activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--danger)' }}
          >
            remove
          </button>
        </div>
      ))}
    </div>
  );
}

function StyleTab() {
  return <ChartOptionsPanel />;
}

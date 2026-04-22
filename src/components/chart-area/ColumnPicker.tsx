interface ColumnPickerProps {
  label: string;
  value: string;
  columns: string[];
  onChange: (col: string) => void;
}

export function ColumnPicker({ label, value, columns, onChange }: ColumnPickerProps) {
  return (
    <label className="flex items-center gap-1">
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-0.5 rounded text-xs"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <option value="">--</option>
        {columns.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}

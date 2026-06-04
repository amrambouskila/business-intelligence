interface NumberOptionProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export function NumberOption({ label, value, min, max, step, onChange }: NumberOptionProps) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20"
          style={{ accentColor: 'var(--accent)' }}
        />
        <span className="w-8 text-right" style={{ color: 'var(--text-muted)' }}>
          {value}
        </span>
      </div>
    </label>
  );
}

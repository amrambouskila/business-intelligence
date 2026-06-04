interface ColorOptionProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorOption({ label, value, onChange }: ColorOptionProps) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-5 rounded"
        style={{ background: 'transparent', border: '1px solid var(--border)' }}
      />
    </label>
  );
}

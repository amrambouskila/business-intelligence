interface ToggleOptionProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleOption({ label, value, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-center justify-between text-xs cursor-pointer">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)' }}
      />
    </label>
  );
}

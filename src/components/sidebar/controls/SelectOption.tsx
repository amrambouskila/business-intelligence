interface SelectOptionProps {
  label: string;
  value: string;
  choices: { value: string; label: string }[];
  onChange: (v: string) => void;
}

export function SelectOption({ label, value, choices, onChange }: SelectOptionProps) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-0.5 rounded text-xs"
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        {choices.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </label>
  );
}

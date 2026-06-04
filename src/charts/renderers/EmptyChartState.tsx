interface EmptyChartStateProps {
  message: string;
}

/** Themed placeholder shown when a chart has nothing to render (no/empty data). */
export function EmptyChartState({ message }: EmptyChartStateProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

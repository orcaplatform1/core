export function Sparkline({ data, positive }: { data?: number[]; positive: boolean }) {
  if (!data || data.length < 2) {
    return <div className="h-8 w-16 shrink-0" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 30 - 1;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "var(--success)" : "var(--danger)";

  return (
    <svg viewBox="0 0 100 32" className="h-8 w-16 shrink-0" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CircularProgress({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: React.ReactNode;
}) {
  return (
    <div className="relative flex size-24 shrink-0 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-lg"
        style={{ backgroundColor: color }}
      />
      <div
        className="relative flex size-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.07) ${value * 3.6}deg 360deg)`,
        }}
      >
        <div className="flex size-[72px] flex-col items-center justify-center rounded-full bg-card">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

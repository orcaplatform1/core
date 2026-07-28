import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import type { ToolItemData, ToolPreviewKey } from "@/lib/marketing/site-content-types";

function ScannerPreview() {
  const rows = [
    { symbol: "BTC", side: "BUY", price: "67.842", change: "+2.4%" },
    { symbol: "ETH", side: "SELL", price: "3.512", change: "-1.1%" },
    { symbol: "SOL", side: "BUY", price: "178,3", change: "+5.7%" },
  ];
  return (
    <div className="space-y-1.5 text-[10px]">
      {rows.map((r) => (
        <div key={r.symbol} className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1.5">
          <span className="font-medium text-foreground/80">{r.symbol}</span>
          <span className="text-muted-foreground">${r.price}</span>
          <span className={r.side === "BUY" ? "text-success" : "text-danger"}>{r.change}</span>
        </div>
      ))}
    </div>
  );
}

function BacktestPreview() {
  const bars = [40, 55, 35, 60, 70, 50, 80, 65, 90, 75];
  return (
    <div className="flex h-full items-end gap-1">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/40" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

// Mini TradingView tarzı mum grafik — çubuk/çizgi yerine gerçek bir grafik terminaline
// benzemesi için OHLC mumları (gövde + fitil) çiziyor.
function SimulationPreview() {
  const candles = [
    { o: 30, c: 22, h: 34, l: 20 },
    { o: 22, c: 26, h: 28, l: 18 },
    { o: 26, c: 18, h: 27, l: 15 },
    { o: 18, c: 24, h: 26, l: 16 },
    { o: 24, c: 14, h: 25, l: 12 },
    { o: 14, c: 19, h: 21, l: 11 },
    { o: 19, c: 10, h: 20, l: 8 },
    { o: 10, c: 15, h: 17, l: 8 },
    { o: 15, c: 6, h: 16, l: 5 },
    { o: 6, c: 12, h: 14, l: 4 },
  ];
  const step = 100 / candles.length;
  return (
    <svg viewBox="0 0 100 50" className="h-full w-full" preserveAspectRatio="none">
      {candles.map((c, i) => {
        const x = i * step + step / 2;
        const up = c.c < c.o; // svg y ekseni ters: küçük y = yukarı
        const color = up ? "var(--success)" : "var(--danger)";
        const bodyTop = Math.min(c.o, c.c);
        const bodyBottom = Math.max(c.o, c.c);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={c.h} y2={c.l} stroke={color} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            <rect
              x={x - step * 0.28}
              y={bodyTop}
              width={step * 0.56}
              height={Math.max(1.5, bodyBottom - bodyTop)}
              fill={color}
              rx="0.6"
            />
          </g>
        );
      })}
    </svg>
  );
}

function CalendarPreview() {
  const events = [
    { label: "FED Faiz Kararı", time: "Bugün 21:00" },
    { label: "TÜFE Verisi (USD)", time: "Yarın 15:30" },
    { label: "Tarım Dışı İstihdam", time: "Cum 15:30" },
  ];
  return (
    <div className="space-y-1.5 text-[10px]">
      {events.map((e) => (
        <div key={e.label} className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1.5">
          <span className="text-foreground/80">{e.label}</span>
          <span className="text-muted-foreground">{e.time}</span>
        </div>
      ))}
    </div>
  );
}

// Piyasa heatmap'i — her hücre bir varlığı ve yüzdesel performansına göre
// yeşil/kırmızı yoğunluğunu temsil ediyor (gerçek heatmap araçlarına referansla).
function LiveAnalysisPreview() {
  const cells = [
    { symbol: "BTC", change: 2.4 },
    { symbol: "ETH", change: 1.1 },
    { symbol: "SOL", change: 5.7 },
    { symbol: "BNB", change: -0.8 },
    { symbol: "XRP", change: -2.6 },
    { symbol: "AVAX", change: 3.2 },
    { symbol: "ADA", change: -1.4 },
    { symbol: "DOGE", change: 0.6 },
  ];
  const maxAbs = Math.max(...cells.map((c) => Math.abs(c.change)));
  return (
    <div className="grid h-full grid-cols-4 gap-1">
      {cells.map((c) => {
        const alpha = 0.35 + (Math.abs(c.change) / maxAbs) * 0.55;
        const rgb = c.change >= 0 ? "34,197,94" : "239,68,68";
        return (
          <div
            key={c.symbol}
            className="flex flex-col items-center justify-center rounded-sm text-[8px] font-medium text-white"
            style={{ backgroundColor: `rgba(${rgb},${alpha})` }}
          >
            <span>{c.symbol}</span>
            <span className="opacity-80">{c.change > 0 ? "+" : ""}{c.change.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

const PREVIEW_BY_KEY: Record<ToolPreviewKey, React.ReactNode> = {
  scanner: <ScannerPreview />,
  backtest: <BacktestPreview />,
  simulation: <SimulationPreview />,
  calendar: <CalendarPreview />,
  live: <LiveAnalysisPreview />,
};

export function ToolsShowcase({
  title = "Neden ORCA ?",
  subtitle = "Yapay zeka destekli araçlarımızla piyasayı daha iyi analiz edin, stratejinizi geliştirin ve bir adım önde olun.",
  tools,
}: {
  title?: string;
  subtitle?: string;
  tools: ToolItemData[];
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Yeni Nesil
            </span>
          </div>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        <Link href="/programs" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Tüm Araçları Keşfet <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tools.map((tool) => {
          const Icon = resolveIcon(tool.icon);
          return (
            <Link
              key={tool.title}
              href={tool.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="h-24 border-b border-white/[0.06] bg-black/10 p-3">
                {PREVIEW_BY_KEY[tool.previewKey]}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Icon className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground">{tool.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground">{tool.description}</p>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

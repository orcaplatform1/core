import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import type { ToolItemData, ToolPreviewKey } from "@/lib/marketing/site-content-types";

function ScannerPreview() {
  const rows = [
    { symbol: "BTC", side: "BUY", rsi: "34.2" },
    { symbol: "ETH", side: "SELL", rsi: "71.8" },
    { symbol: "SOL", side: "BUY", rsi: "28.5" },
  ];
  return (
    <div className="space-y-1.5 text-[10px]">
      {rows.map((r) => (
        <div key={r.symbol} className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1.5">
          <span className="font-medium text-foreground/80">{r.symbol}</span>
          <span className={r.side === "BUY" ? "text-success" : "text-danger"}>{r.side}</span>
          <span className="text-muted-foreground">RSI {r.rsi}</span>
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

function SimulationPreview() {
  return (
    <svg viewBox="0 0 100 50" className="h-full w-full" preserveAspectRatio="none">
      <polyline
        points="0,40 15,32 30,36 45,18 60,24 75,10 100,15"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="15" cy="32" r="2.2" fill="var(--success)" />
      <circle cx="75" cy="10" r="2.2" fill="var(--danger)" />
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

function LiveAnalysisPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="size-16 rounded-full"
        style={{
          background: "conic-gradient(var(--primary) 0deg 230deg, rgba(255,255,255,0.08) 230deg 360deg)",
          mask: "radial-gradient(closest-side, transparent 62%, black 63%)",
          WebkitMask: "radial-gradient(closest-side, transparent 62%, black 63%)",
        }}
      />
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
  title = "ORCA Araçları",
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

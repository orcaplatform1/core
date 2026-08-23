"use client";

import { useState } from "react";
import { Activity, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useOrderFlow, useOrderFlowHeatmap } from "@/lib/hooks/use-tools";
import type { CvdBucket, LargeTrade, OrderFlowData } from "@/lib/types/tools";
import { displayTicker } from "@/lib/utils";
import { PremiumGlowCard } from "./premium-glow-card";
import { HeatmapWall } from "./heatmap-wall";
import { FootprintChart } from "./footprint-chart";

// Eğitim amaçlı terminal — top50 yerine sadece en çok izlenen iki sembol,
// arama gerektirmeyen sabit etiket/pill seçici.
const SYMBOLS = ["BTCUSDT", "ETHUSDT"];

function fmtPrice(n: number) {
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtCompact(n: number | null, prefix = "") {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${prefix}${abs.toFixed(2)}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 5) return "az önce";
  if (diffSec < 60) return `${diffSec}sn önce`;
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}dk önce`;
}

function SymbolTabs({
  symbols,
  value,
  onChange,
}: {
  symbols: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {symbols.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full border px-3 py-1 text-tag transition-colors ${
            s === value
              ? "border-purple/40 bg-purple/15 text-purple"
              : "border-purple/20 text-foreground/70 hover:bg-card-hover"
          }`}
        >
          {displayTicker(s)}
        </button>
      ))}
    </div>
  );
}

function StatInline({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-body-xs text-muted-foreground">{label}</span>
      <span className={`text-financial text-foreground/90 ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}

function CvdChart({ history, cumulativeDelta }: { history: CvdBucket[]; cumulativeDelta: number }) {
  if (history.length < 2) {
    return <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>;
  }

  const maxAbsDelta = Math.max(...history.map((b) => Math.abs(b.delta)), 1e-9);
  const cumValues = history.map((b) => b.cumulative);
  const minCum = Math.min(...cumValues, 0);
  const maxCum = Math.max(...cumValues, 0);
  const cumRange = maxCum - minCum || 1;

  const H = 26;
  const W = 100;
  const baseline = H / 2;
  const barW = W / history.length;

  const linePoints = history
    .map((b, i) => {
      const x = (i + 0.5) * barW;
      const y = H - 1 - ((b.cumulative - minCum) / cumRange) * (H - 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-body-xs text-muted-foreground">
        <span>CVD (delta histogramı + kümülatif)</span>
        <span className={cumulativeDelta >= 0 ? "text-financial text-success" : "text-financial text-danger"}>
          Net: {cumulativeDelta >= 0 ? "+" : ""}
          {fmtCompact(cumulativeDelta)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none">
        <line x1={0} y1={baseline} x2={W} y2={baseline} stroke="var(--border)" strokeWidth={0.5} />
        {history.map((b, i) => {
          const barH = (Math.abs(b.delta) / maxAbsDelta) * (baseline - 1);
          const x = i * barW + barW * 0.15;
          const w = barW * 0.7;
          const y = b.delta >= 0 ? baseline - barH : baseline;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={Math.max(barH, 0.3)}
              fill={b.delta >= 0 ? "var(--success)" : "var(--danger)"}
              opacity={0.55}
            />
          );
        })}
        <polyline points={linePoints} fill="none" stroke="var(--purple)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}


function LargeTradesFeed({ trades }: { trades: LargeTrade[] }) {
  if (trades.length === 0) {
    return <p className="text-body-xs text-muted-foreground">Bu pencerede büyük emir tespit edilmedi.</p>;
  }
  return (
    <div className="max-h-[360px] space-y-1 overflow-y-auto">
      {trades.map((t, i) => {
        const isBuy = t.side === "BUY";
        const Icon = isBuy ? ArrowUpCircle : ArrowDownCircle;
        return (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-card-hover">
            <div className="flex items-center gap-2">
              <Icon className={`size-4 shrink-0 ${isBuy ? "text-success" : "text-danger"}`} />
              <span className="text-financial text-foreground/90">${fmtPrice(t.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-financial ${isBuy ? "text-success" : "text-danger"}`}>${fmtCompact(t.quoteQty)}</span>
              <span className="w-14 shrink-0 text-right text-body-xs text-muted-foreground">{relativeTime(t.time)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function isValidData(data: unknown): data is OrderFlowData {
  return !!data && typeof data === "object" && Array.isArray((data as OrderFlowData).levels);
}

export function OrderFlowSection() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const { data: raw } = useOrderFlow(symbol);
  const data = isValidData(raw) ? raw : null;
  const { data: heatmap } = useOrderFlowHeatmap(symbol);

  return (
    <PremiumGlowCard title="Order Flow — Emir Akışı Terminali" icon={Activity}>
      <div className="mb-3">
        <SymbolTabs symbols={SYMBOLS} value={symbol} onChange={setSymbol} />
      </div>

      {data && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border pb-3">
          <StatInline label="Fiyat" value={`$${fmtPrice(data.midPrice)}`} />
          <StatInline
            label="24s"
            value={`${data.priceChangePercent24h != null && data.priceChangePercent24h >= 0 ? "+" : ""}${data.priceChangePercent24h?.toFixed(2) ?? "—"}%`}
            valueClassName={data.priceChangePercent24h != null && data.priceChangePercent24h < 0 ? "text-danger" : "text-success"}
          />
          <StatInline label="Hacim" value={`$${fmtCompact(data.quoteVolume24h)}`} />
          <StatInline label="Spread" value={`%${data.spreadPercent.toFixed(4)}`} />
          <StatInline
            label="Bid/Ask"
            value={`${data.bidAskImbalancePercent >= 0 ? "+" : ""}${data.bidAskImbalancePercent.toFixed(1)}%`}
            valueClassName={data.bidAskImbalancePercent >= 0 ? "text-success" : "text-danger"}
          />
          <StatInline
            label="Funding"
            value={`${data.fundingRatePercent != null && data.fundingRatePercent >= 0 ? "+" : ""}${data.fundingRatePercent?.toFixed(4) ?? "—"}%`}
            valueClassName={data.fundingRatePercent != null && data.fundingRatePercent < 0 ? "text-danger" : "text-success"}
          />
          <StatInline label="OI" value={`$${fmtCompact(data.openInterestValueUsd)}`} />
          <StatInline
            label="Global L/S"
            value={data.globalLongShortAccountRatio?.toFixed(2) ?? "—"}
            valueClassName={data.globalLongShortAccountRatio != null && data.globalLongShortAccountRatio >= 1 ? "text-success" : "text-danger"}
          />
          <StatInline
            label="Top Trader L/S"
            value={data.topTraderLongShortPositionRatio?.toFixed(2) ?? "—"}
            valueClassName={data.topTraderLongShortPositionRatio != null && data.topTraderLongShortPositionRatio >= 1 ? "text-success" : "text-danger"}
          />
          <StatInline
            label="Taker Al/Sat"
            value={data.takerBuySellRatio?.toFixed(2) ?? "—"}
            valueClassName={data.takerBuySellRatio != null && data.takerBuySellRatio >= 1 ? "text-success" : "text-danger"}
          />
        </div>
      )}

      <HeatmapWall data={heatmap} trades={heatmap?.trades} />

      <div className="mt-3 border-t border-border pt-3">
        <FootprintChart data={heatmap} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <CvdChart history={data?.cvdHistory ?? []} cumulativeDelta={data?.cumulativeDelta ?? 0} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1.5 text-body-xs text-muted-foreground">Büyük emirler</p>
        {data ? <LargeTradesFeed trades={data.largeTrades} /> : (
          <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
        )}
      </div>
    </PremiumGlowCard>
  );
}

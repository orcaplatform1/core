"use client";

import { LineChart, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { useBistIndex, useBistStocks } from "@/lib/hooks/use-tools";
import type { BistQuote } from "@/lib/types/tools";
import { ToolCard, type ToolAccent } from "./tool-card";

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function ChangePill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={
        positive
          ? "rounded-full bg-success/10 px-2 py-0.5 text-badge text-success"
          : "rounded-full bg-danger/10 px-2 py-0.5 text-badge text-danger"
      }
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function IndexHeroCard() {
  const { data } = useBistIndex();
  return (
    <ToolCard title="BIST 100 Endeksi" icon={Landmark} accent="primary" className="sm:col-span-2 lg:col-span-4">
      {!data ? (
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      ) : (
        <div className="flex items-baseline gap-4">
          <span className="text-num-lg text-foreground">{fmtPrice(data.price)}</span>
          <ChangePill value={data.changePercent} />
        </div>
      )}
    </ToolCard>
  );
}

function StockTable({
  title,
  rows,
  icon,
  accent,
}: {
  title: string;
  rows: BistQuote[];
  icon: React.ElementType;
  accent: ToolAccent;
}) {
  return (
    <ToolCard title={title} icon={icon} accent={accent}>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {rows.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-card-hover"
          >
            <span className="truncate text-financial text-foreground/90">{r.symbol}</span>
            <span className="text-financial text-muted-foreground">₺{fmtPrice(r.price)}</span>
            <ChangePill value={r.changePercent} />
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

export function BistToolsSection() {
  const { data } = useBistStocks();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IndexHeroCard />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StockTable title="En Çok Yükselenler" rows={data?.gainers ?? []} icon={TrendingUp} accent="success" />
        <StockTable title="En Çok Düşenler" rows={data?.losers ?? []} icon={TrendingDown} accent="danger" />
      </div>

      <ToolCard title="Popüler BIST Hisseleri" icon={LineChart} accent="primary">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.stocks ?? []).length === 0 && (
            <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
          )}
          {(data?.stocks ?? []).map((r) => (
            <div
              key={r.symbol}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-card-hover"
            >
              <div className="min-w-0">
                <p className="truncate text-financial text-foreground/90">{r.symbol}</p>
                <p className="truncate text-body-xs text-muted-foreground">{r.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-financial text-muted-foreground">₺{fmtPrice(r.price)}</span>
                <ChangePill value={r.changePercent} />
              </div>
            </div>
          ))}
        </div>
      </ToolCard>
    </div>
  );
}

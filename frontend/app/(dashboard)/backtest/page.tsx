"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBacktestSymbols } from "@/lib/hooks/use-backtest";
import { KlineTradingChart } from "@/components/trading-chart/kline-trading-chart";

type Category = "crypto" | "forex";
type Timeframe = "1d" | "1h";

export default function BacktestPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");

  const { data: symbols, isLoading: symbolsLoading } = useBacktestSymbols();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F1EA]">Backtest</h1>
        <p className="text-sm text-[#A8A6A0]">
          Geçmiş fiyat verisi üzerinde grafik incele, çizim araçlarıyla işaretle ve Yapay Zeka Mentordan değerlendirme al.
        </p>
      </div>

      {!category && (
        <div className="flex gap-4">
          <Button onClick={() => setCategory("crypto")}>Kripto</Button>
          <Button onClick={() => setCategory("forex")}>Forex</Button>
        </div>
      )}

      {category && !symbol && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-[#F5F1EA]">
              {category === "crypto" ? "Kripto Paritesi Seç" : "Forex/Emtia Paritesi Seç"}
            </h2>
            <Button variant="ghost" onClick={() => setCategory(null)}>
              Geri
            </Button>
          </div>
          {symbolsLoading ? (
            <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(category === "crypto" ? symbols?.crypto : symbols?.forex)?.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className="rounded-xl border border-border bg-card-inner px-4 py-2 text-sm text-[#A8A6A0] hover:border-primary hover:text-[#F5F1EA]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {symbol && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-[#F5F1EA]">{symbol}</h2>
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setTimeframe("1d")}
                  className={`px-3 py-1.5 text-sm ${timeframe === "1d" ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
                >
                  Günlük
                </button>
                <button
                  onClick={() => setTimeframe("1h")}
                  className={`px-3 py-1.5 text-sm ${timeframe === "1h" ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
                >
                  1 Saatlik
                </button>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setSymbol("")}>
              Parite Değiştir
            </Button>
          </div>

          <KlineTradingChart
            symbol={symbol}
            timeframe={timeframe}
            timeframeLabel={timeframe === "1d" ? "Günlük" : "1 Saatlik"}
            context="backtest"
          />
        </div>
      )}
    </div>
  );
}

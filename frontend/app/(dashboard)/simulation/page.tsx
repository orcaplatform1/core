"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBacktestSymbols } from "@/lib/hooks/use-backtest";
import {
  useSimulationAccount,
  useSimulationTrades,
  useOpenTrade,
  useCloseTrade,
} from "@/lib/hooks/use-simulation";
import { TradingChart } from "@/components/trading-chart/trading-chart";

type Category = "crypto" | "forex";
type Timeframe = "1d" | "1h";

function formatMoney(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SimulationPage() {
  const [category, setCategory] = useState<Category>("crypto");
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("1");

  const { data: symbols, isLoading: symbolsLoading } = useBacktestSymbols();
  const { data: account, isLoading: accountLoading } = useSimulationAccount();
  const { data: trades, isLoading: tradesLoading } = useSimulationTrades();
  const openTrade = useOpenTrade();
  const closeTrade = useCloseTrade();

  const openTrades = trades?.filter((t) => t.status === "OPEN") ?? [];
  const closedTrades = trades?.filter((t) => t.status === "CLOSED") ?? [];

  async function handleOpen() {
    const qty = parseFloat(quantity);
    const lev = parseInt(leverage, 10);
    if (!symbol) {
      toast.error("Önce bir parite seç");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Geçerli bir miktar gir");
      return;
    }
    if (!lev || lev < 1 || lev > 125) {
      toast.error("Kaldıraç 1 ile 125 arasında olmalı");
      return;
    }
    try {
      await openTrade.mutateAsync({ symbol, direction, quantity: qty, leverage: lev });
      toast.success("Pozisyon açıldı");
      setQuantity("");
    } catch (err: any) {
      toast.error(err?.message ?? "Pozisyon açılamadı");
    }
  }

  async function handleClose(tradeId: string) {
    try {
      await closeTrade.mutateAsync(tradeId);
      toast.success("Pozisyon kapatıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Pozisyon kapatılamadı");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F1EA]">Simülasyon</h1>
        <p className="text-sm text-[#A8A6A0]">
          Gerçek para riski olmadan, sanal bakiyenle piyasa fiyatları üzerinden pozisyon aç/kapat.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#A8A6A0]">Sanal Bakiye</p>
        <p className="text-3xl font-semibold text-[#F5F1EA]">
          {accountLoading ? "..." : `$${formatMoney(account?.balance ?? 0)}`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-medium text-[#F5F1EA]">Yeni Pozisyon</h2>

        <div className="flex rounded-xl border border-border overflow-hidden w-fit">
          <button
            onClick={() => {
              setCategory("crypto");
              setSymbol("");
            }}
            className={`px-4 py-1.5 text-sm ${category === "crypto" ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            Kripto
          </button>
          <button
            onClick={() => {
              setCategory("forex");
              setSymbol("");
            }}
            className={`px-4 py-1.5 text-sm ${category === "forex" ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            Forex
          </button>
        </div>

        {symbolsLoading ? (
          <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(category === "crypto" ? symbols?.crypto : symbols?.forex)?.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className="rounded-xl border px-3 py-1.5 text-sm transition"
                style={{
                  borderColor: symbol === s ? "#3B5BFF" : "#1C2740",
                  backgroundColor: symbol === s ? "#3B5BFF22" : "#141E32",
                  color: symbol === s ? "#F5F1EA" : "#A8A6A0",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {symbol && (
          <div className="space-y-3">
            <div className="flex rounded-xl border border-border overflow-hidden w-fit">
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
            <TradingChart
              symbol={symbol}
              timeframe={timeframe}
              timeframeLabel={timeframe === "1d" ? "Günlük" : "1 Saatlik"}
              context="simulation"
            />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setDirection("BUY")}
              className={`px-4 py-2 text-sm font-medium ${direction === "BUY" ? "bg-[#22C55E] text-white" : "bg-card-inner text-[#A8A6A0]"}`}
            >
              Al (Long)
            </button>
            <button
              onClick={() => setDirection("SELL")}
              className={`px-4 py-2 text-sm font-medium ${direction === "SELL" ? "bg-[#EF4444] text-white" : "bg-card-inner text-[#A8A6A0]"}`}
            >
              Sat (Short)
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#A8A6A0]">Miktar</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-32 rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#A8A6A0] outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#A8A6A0]">Kaldıraç</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={125}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="1"
                className="w-20 rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#A8A6A0] outline-none focus:border-primary"
              />
              <span className="text-sm text-[#A8A6A0]">x</span>
            </div>
          </div>

          <Button disabled={openTrade.isPending} onClick={handleOpen}>
            {openTrade.isPending ? "Açılıyor..." : "Pozisyon Aç"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-medium text-[#F5F1EA]">Açık Pozisyonlar</h2>
        {tradesLoading ? (
          <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : openTrades.length === 0 ? (
          <p className="text-sm text-[#A8A6A0]">Açık pozisyon yok.</p>
        ) : (
          <ul className="space-y-2">
            {openTrades.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-[#F5F1EA]">{t.symbol}</span>{" "}
                  <span style={{ color: t.direction === "BUY" ? "#22C55E" : "#EF4444" }}>
                    {t.direction === "BUY" ? "Long" : "Short"}
                  </span>{" "}
                  <span className="text-[#A8A6A0]">
                    {t.quantity} adet @ {formatMoney(t.entryPrice)} · {t.leverage}x
                  </span>
                </div>
                <Button
                  variant="outline"
                  disabled={closeTrade.isPending}
                  onClick={() => handleClose(t.id)}
                >
                  Kapat
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-medium text-[#F5F1EA]">Geçmiş</h2>
        {tradesLoading ? (
          <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : closedTrades.length === 0 ? (
          <p className="text-sm text-[#A8A6A0]">Henüz kapatılmış işlem yok.</p>
        ) : (
          <ul className="space-y-2">
            {closedTrades.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-[#F5F1EA]">{t.symbol}</span>{" "}
                  <span style={{ color: t.direction === "BUY" ? "#22C55E" : "#EF4444" }}>
                    {t.direction === "BUY" ? "Long" : "Short"}
                  </span>{" "}
                  <span className="text-[#A8A6A0]">
                    {t.quantity} adet @ {formatMoney(t.entryPrice)} → {t.exitPrice ? formatMoney(t.exitPrice) : "-"}
                  </span>
                </div>
                <span
                  className="font-medium"
                  style={{ color: (t.pnl ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}
                >
                  {(t.pnl ?? 0) >= 0 ? "+" : ""}
                  {formatMoney(t.pnl ?? 0)} $
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

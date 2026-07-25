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

type Category = "crypto" | "forex";

function formatMoney(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SimulationPage() {
  const [category, setCategory] = useState<Category>("crypto");
  const [symbol, setSymbol] = useState<string>("");
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
        <p className="text-sm text-[#A69B8A]">
          Gerçek para riski olmadan, sanal bakiyenle piyasa fiyatları üzerinden pozisyon aç/kapat.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#A69B8A]">Sanal Bakiye</p>
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
            className={`px-4 py-1.5 text-sm ${category === "crypto" ? "bg-primary text-white" : "bg-card-inner text-[#A69B8A]"}`}
          >
            Kripto
          </button>
          <button
            onClick={() => {
              setCategory("forex");
              setSymbol("");
            }}
            className={`px-4 py-1.5 text-sm ${category === "forex" ? "bg-primary text-white" : "bg-card-inner text-[#A69B8A]"}`}
          >
            Forex
          </button>
        </div>

        {symbolsLoading ? (
          <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(category === "crypto" ? symbols?.crypto : symbols?.forex)?.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className="rounded-xl border px-3 py-1.5 text-sm transition"
                style={{
                  borderColor: symbol === s ? "#E8A63C" : "#2E2820",
                  backgroundColor: symbol === s ? "#E8A63C22" : "#241F19",
                  color: symbol === s ? "#F5F1EA" : "#A69B8A",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setDirection("BUY")}
              className={`px-4 py-2 text-sm font-medium ${direction === "BUY" ? "bg-[#22C55E] text-white" : "bg-card-inner text-[#A69B8A]"}`}
            >
              Al (Long)
            </button>
            <button
              onClick={() => setDirection("SELL")}
              className={`px-4 py-2 text-sm font-medium ${direction === "SELL" ? "bg-[#EF4444] text-white" : "bg-card-inner text-[#A69B8A]"}`}
            >
              Sat (Short)
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#A69B8A]">Miktar</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-32 rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#A69B8A] outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#A69B8A]">Kaldıraç</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={125}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="1"
                className="w-20 rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#A69B8A] outline-none focus:border-primary"
              />
              <span className="text-sm text-[#A69B8A]">x</span>
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
          <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
        ) : openTrades.length === 0 ? (
          <p className="text-sm text-[#A69B8A]">Açık pozisyon yok.</p>
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
                  <span className="text-[#A69B8A]">
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
          <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
        ) : closedTrades.length === 0 ? (
          <p className="text-sm text-[#A69B8A]">Henüz kapatılmış işlem yok.</p>
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
                  <span className="text-[#A69B8A]">
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

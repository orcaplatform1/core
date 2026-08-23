"use client";

import { useMemo, useState } from "react";
import { Calculator, Clock, Coins, Grid3x3, LineChart, Percent, Ruler, Scale } from "lucide-react";
import { useForexQuotes, useGoldAndTl, useCotReport, useCorrelationMatrix } from "@/lib/hooks/use-tools";
import type { ForexQuote } from "@/lib/types/tools";
import { ToolCard } from "./tool-card";
import { PremiumGlowCard } from "./premium-glow-card";

function fieldClass() {
  return "w-full rounded-lg border border-border card-inner px-3 py-1.5 text-sm text-foreground outline-none focus:border-purple/50";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-body-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function isJpyPair(symbol: string) {
  return symbol.endsWith("JPY");
}

function QuotesGrid() {
  const { data } = useForexQuotes();
  const rows = data ?? [];
  const dxy = rows.find((r) => r.symbol === "DXY");
  const pairs = rows.filter((r) => r.symbol !== "DXY");
  const biggestMoverSymbol = [...pairs].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0]
    ?.symbol;

  return (
    <ToolCard
      title="En Çok İşlem Gören 10 Parite"
      icon={LineChart}
      accent="primary"
      badge={
        <span className="ml-auto flex items-center gap-1 text-body-xs text-muted-foreground">
          <Clock className="size-3" /> ~15 dk gecikmeli
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pairs.length === 0 && <p className="col-span-full text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {pairs.map((r: ForexQuote) => {
          const isBiggestMover = r.symbol === biggestMoverSymbol;
          return (
            <div
              key={r.symbol}
              className={`rounded-lg border-l-2 card-inner p-3 text-body-xs transition-colors hover:bg-card-hover ${
                r.changePercent >= 0 ? "border-l-success/60" : "border-l-danger/60"
              } ${
                isBiggestMover
                  ? "ring-1 ring-warning/50 shadow-[0_0_16px_-4px_rgba(243,156,61,0.5)]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-financial text-foreground/90">{r.symbol}</p>
                {isBiggestMover && (
                  <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-badge text-warning">
                    EN HAREKETLİ
                  </span>
                )}
              </div>
              <p className="mt-1 text-financial text-muted-foreground">{r.price.toFixed(isJpyPair(r.symbol) ? 3 : 5)}</p>
              <p className={`mt-1 text-financial ${r.changePercent >= 0 ? "text-success" : "text-danger"}`}>
                {r.changePercent >= 0 ? "+" : ""}
                {r.changePercent.toFixed(2)}%
              </p>
            </div>
          );
        })}
      </div>
      {dxy && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
          <span className="text-card-title-sm text-foreground">USD Endeksi (DXY)</span>
          <div className="text-right">
            <p className="text-num-sm text-foreground">{dxy.price.toFixed(2)}</p>
            <p className={`text-financial ${dxy.changePercent >= 0 ? "text-success" : "text-danger"}`}>
              {dxy.changePercent >= 0 ? "+" : ""}
              {dxy.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

function GoldAndTlCard() {
  const { data } = useGoldAndTl();
  return (
    <ToolCard title="Emtia & TL Pariteleri" icon={Coins} accent="warning">
      {!data ? (
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Gram Altın</p>
            <p className="mt-1 text-num-sm text-foreground">
              ₺{data.gramAltinTry.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Ons Altın</p>
            <p className="mt-1 text-num-sm text-foreground">
              ${data.onsAltinUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">USD/TRY</p>
            <p className="mt-1 text-num-sm text-foreground">{data.usdTry.price.toFixed(4)}</p>
            <p className={`text-financial ${data.usdTry.changePercent >= 0 ? "text-success" : "text-danger"}`}>
              {data.usdTry.changePercent >= 0 ? "+" : ""}
              {data.usdTry.changePercent.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">EUR/TRY</p>
            <p className="mt-1 text-num-sm text-foreground">{data.eurTry.price.toFixed(4)}</p>
            <p className={`text-financial ${data.eurTry.changePercent >= 0 ? "text-success" : "text-danger"}`}>
              {data.eurTry.changePercent >= 0 ? "+" : ""}
              {data.eurTry.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

function CotReportCard() {
  const { data } = useCotReport();
  const rows = useMemo(() => [...(data ?? [])].sort((a, b) => b.netPosition - a.netPosition), [data]);
  const maxVal = Math.max(...rows.map((r) => Math.max(r.leveragedLong, r.leveragedShort)), 1);

  return (
    <ToolCard
      title="COT Raporu (Kurumsal Pozisyonlanma)"
      icon={Scale}
      accent="purple"
      badge={
        <span className="ml-auto text-body-xs text-muted-foreground">Kaynak: CFTC, haftalık</span>
      }
    >
      <p className="mb-3 text-body-xs text-muted-foreground">
        Büyük kurumsal fonların (Leveraged Money) uzun/kısa pozisyon dağılımı — solda kısa, sağda uzun kontrat sayısı.
      </p>
      {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const shortPct = (r.leveragedShort / maxVal) * 100;
          const longPct = (r.leveragedLong / maxVal) * 100;
          const changeUp = r.netPositionChange != null && r.netPositionChange >= 0;
          return (
            <div key={r.currency} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-financial text-foreground/90">{r.currency}</span>
              <span className="w-14 shrink-0 text-right text-body-xs text-danger/80">
                {r.leveragedShort.toLocaleString("en-US")}
              </span>
              <div className="flex h-4 flex-1 items-center">
                <div className="flex h-full flex-1 items-center justify-end overflow-hidden rounded-l bg-black/10">
                  <div className="h-full min-w-[2px] bg-danger/70" style={{ width: `${shortPct}%` }} />
                </div>
                <div className="h-5 w-px shrink-0 bg-border" />
                <div className="flex h-full flex-1 items-center justify-start overflow-hidden rounded-r bg-black/10">
                  <div className="h-full min-w-[2px] bg-success/70" style={{ width: `${longPct}%` }} />
                </div>
              </div>
              <span className="w-14 shrink-0 text-body-xs text-success/80">
                {r.leveragedLong.toLocaleString("en-US")}
              </span>
              <div className="w-24 shrink-0 text-right">
                <p className={`text-financial ${r.netPosition >= 0 ? "text-success" : "text-danger"}`}>
                  {r.netPosition >= 0 ? "+" : ""}
                  {r.netPosition.toLocaleString("en-US")}
                </p>
                {r.netPositionChange != null && (
                  <p className={`text-body-xs ${changeUp ? "text-success" : "text-danger"}`}>
                    {changeUp ? "▲" : "▼"} {Math.abs(r.netPositionChange).toLocaleString("en-US")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {rows[0] && (
        <p className="mt-3 border-t border-border pt-2 text-body-xs text-muted-foreground">
          Rapor tarihi: {rows[0].reportDate} · solda kısa / sağda uzun kontrat adedi, sağ sütun net pozisyon ve haftalık değişim
        </p>
      )}
    </ToolCard>
  );
}

function CorrelationMatrixCard() {
  const { data } = useCorrelationMatrix();
  if (!data) {
    return (
      <ToolCard title="Korelasyon Matrisi" icon={Grid3x3} accent="primary">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      </ToolCard>
    );
  }
  return (
    <ToolCard title="Korelasyon Matrisi (30 gün)" icon={Grid3x3} accent="primary">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="p-1"></th>
              {data.symbols.map((s) => (
                <th key={s} className="p-1 text-center font-medium text-muted-foreground">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.symbols.map((rowSymbol, i) => (
              <tr key={rowSymbol}>
                <td className="p-1 font-medium text-foreground/90">{rowSymbol}</td>
                {data.matrix[i].map((value, j) => {
                  const abs = Math.abs(value);
                  const positive = value >= 0;
                  const isSelf = i === j;
                  return (
                    <td key={j} className="p-1 text-center">
                      <span
                        className="inline-flex size-9 items-center justify-center rounded"
                        style={{
                          backgroundColor: isSelf
                            ? "transparent"
                            : `rgba(${positive ? "34,197,94" : "239,68,68"},${0.15 + abs * 0.55})`,
                          color: isSelf ? "var(--muted-foreground)" : undefined,
                        }}
                      >
                        {value.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ToolCard>
  );
}

function PipCalculator() {
  const [pair, setPair] = useState("EURUSD");
  const [lotSize, setLotSize] = useState("1");

  const result = useMemo(() => {
    const lots = parseFloat(lotSize) || 0;
    const units = lots * 100000;
    const pipSize = isJpyPair(pair) ? 0.01 : 0.0001;
    // Basitleştirme: hesap para birimi = karşı (quote) para birimi (çoğu XXX/USD parite için USD).
    const pipValue = pipSize * units;
    return pipValue;
  }, [pair, lotSize]);

  return (
    <PremiumGlowCard title="Pip Hesaplayıcı" icon={Ruler}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Parite">
          <select className={fieldClass()} value={pair} onChange={(e) => setPair(e.target.value)}>
            {["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "EURJPY", "GBPJPY"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lot Büyüklüğü (standart lot)">
          <input
            type="number"
            step="0.01"
            className={fieldClass()}
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
          />
        </Field>
      </div>
      <p className="mt-4 text-body-sm text-muted-foreground">
        1 pip değeri: <span className="text-num-sm text-purple">${result.toFixed(2)}</span>
      </p>
      <p className="mt-1 text-body-xs text-muted-foreground">
        Hesap para birimi karşı para birimiyle (çoğunlukla USD) aynı kabul edilir.
      </p>
    </PremiumGlowCard>
  );
}

function LeverageMarginCalculator() {
  const [units, setUnits] = useState("100000");
  const [price, setPrice] = useState("1.10");
  const [leverage, setLeverage] = useState("100");

  const result = useMemo(() => {
    const u = parseFloat(units) || 0;
    const p = parseFloat(price) || 0;
    const l = parseFloat(leverage) || 1;
    const notional = u * p;
    const margin = notional / l;
    return { notional, margin };
  }, [units, price, leverage]);

  return (
    <PremiumGlowCard title="Kaldıraç / Marj Hesaplayıcı" icon={Percent}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pozisyon (birim)">
          <input type="number" className={fieldClass()} value={units} onChange={(e) => setUnits(e.target.value)} />
        </Field>
        <Field label="Fiyat">
          <input
            type="number"
            step="0.0001"
            className={fieldClass()}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Kaldıraç (x)">
          <input
            type="number"
            className={fieldClass()}
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-body-sm">
        <p className="text-muted-foreground">
          Nominal değer:{" "}
          <span className="text-num-sm text-foreground">
            ${result.notional.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        </p>
        <p className="text-muted-foreground">
          Gerekli marj:{" "}
          <span className="text-num-sm text-purple">
            ${result.margin.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        </p>
      </div>
    </PremiumGlowCard>
  );
}

function PositionSizeCalculator() {
  const [balance, setBalance] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [stopLossPips, setStopLossPips] = useState("20");
  const [pair, setPair] = useState("EURUSD");

  const result = useMemo(() => {
    const bal = parseFloat(balance) || 0;
    const risk = (parseFloat(riskPercent) || 0) / 100;
    const slPips = parseFloat(stopLossPips) || 1;
    const pipSize = isJpyPair(pair) ? 0.01 : 0.0001;
    const riskAmount = bal * risk;
    // 1 standart lot (100.000 birim) için pip değeri (hesap = karşı para birimi varsayımı)
    const pipValuePerStandardLot = pipSize * 100000;
    const lots = riskAmount / (slPips * pipValuePerStandardLot);
    return { riskAmount, lots };
  }, [balance, riskPercent, stopLossPips, pair]);

  return (
    <PremiumGlowCard title="Pozisyon Boyutu Hesaplayıcı" icon={Calculator}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Hesap Bakiyesi ($)">
          <input type="number" className={fieldClass()} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <Field label="Risk (%)">
          <input
            type="number"
            step="0.1"
            className={fieldClass()}
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
          />
        </Field>
        <Field label="Stop-Loss (pip)">
          <input
            type="number"
            className={fieldClass()}
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
          />
        </Field>
        <Field label="Parite">
          <select className={fieldClass()} value={pair} onChange={(e) => setPair(e.target.value)}>
            {["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-body-sm">
        <p className="text-muted-foreground">
          Riske edilen tutar: <span className="text-num-sm text-foreground">${result.riskAmount.toFixed(2)}</span>
        </p>
        <p className="text-muted-foreground">
          Önerilen pozisyon: <span className="text-num-sm text-purple">{result.lots.toFixed(2)} lot</span>
        </p>
      </div>
    </PremiumGlowCard>
  );
}

export function ForexToolsSection() {
  return (
    <div className="space-y-6">
      <QuotesGrid />
      <GoldAndTlCard />

      <div className="flex items-center gap-2 pt-2">
        <Calculator className="size-4 text-purple" />
        <h3 className="text-h6 text-foreground">Hesaplayıcılar</h3>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PipCalculator />
        <LeverageMarginCalculator />
      </div>
      <PositionSizeCalculator />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CotReportCard />
        <CorrelationMatrixCard />
      </div>
    </div>
  );
}

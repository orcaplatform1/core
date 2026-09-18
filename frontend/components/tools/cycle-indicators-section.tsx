"use client";

import { useState } from "react";
import {
  Gauge,
  TrendingUp,
  Waves,
  Flame,
  Rainbow,
  Landmark,
  Coins,
  LineChart,
  Percent,
  ArrowLeftRight,
  Calculator,
  Target,
  Scale,
  Globe,
  Radar,
  Layers,
} from "lucide-react";
import {
  useCbbi,
  useCycleSnapshot,
  useCycleMacro,
  useExchangeFlows,
  useAhr999,
  useTwoYearMaMultiplier,
  useCycleRsiHeatmap,
  useLongShortRatio,
  useMarketPulse,
  postDcaCalculator,
} from "@/lib/hooks/use-tools";
import type { DcaResult } from "@/lib/types/tools";
import { displayTicker } from "@/lib/utils";
import { ToolCard, type ToolAccent } from "./tool-card";
import { CircularProgress } from "./circular-progress";

// ---------- ortak yardımcılar ----------

type Zone = "cold" | "neutral" | "warm" | "hot";

const ZONE_STYLE: Record<Zone, { label: string; className: string }> = {
  cold: { label: "Dip Bölgesi", className: "bg-success/10 text-success" },
  neutral: { label: "Nötr", className: "bg-primary/10 text-primary" },
  warm: { label: "Dikkat", className: "bg-warning/10 text-warning" },
  hot: { label: "Tepe Bölgesi", className: "bg-danger/10 text-danger" },
};

function ZonePill({ zone }: { zone: Zone }) {
  const s = ZONE_STYLE[zone];
  return <span className={`rounded-full px-2 py-0.5 text-badge ${s.className}`}>{s.label}</span>;
}

function fmtNum(n: number | null | undefined, digits = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function fmtUsd(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
}

function fmtCompactUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })}`;
}

// Normalize 0-1 skor (CBBI) -> zone. Kendi eşiğimizi icat etmek yerine CBBI'nin
// çapraz-gösterge normalize skoru kullanılır (plan: >0.7 kırmızı, 0.3-0.7 nötr, <0.3 yeşil).
function zoneFromNormalized(v: number | null | undefined): Zone {
  if (v == null) return "neutral";
  if (v > 0.7) return "hot";
  if (v > 0.4) return "warm";
  if (v > 0.15) return "neutral";
  return "cold";
}

function IndicatorCard({
  title,
  icon,
  accent,
  value,
  valueSuffix,
  zone,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  accent: ToolAccent;
  value: string;
  valueSuffix?: string;
  zone: Zone;
  subtitle?: string;
}) {
  return (
    <ToolCard title={title} icon={icon} accent={accent} badge={<ZonePill zone={zone} />}>
      <p className="text-num-md text-foreground">
        {value}
        {valueSuffix && <span className="ml-1 text-body-xs text-muted-foreground">{valueSuffix}</span>}
      </p>
      {subtitle && <p className="mt-1 text-body-xs text-muted-foreground">{subtitle}</p>}
    </ToolCard>
  );
}

function LoadingCard({ title, icon, accent }: { title: string; icon: React.ElementType; accent: ToolAccent }) {
  return (
    <ToolCard title={title} icon={icon} accent={accent}>
      <p className="text-body-xs text-muted-foreground">Veri yükleniyor... (günlük hesaplanır)</p>
    </ToolCard>
  );
}

// ---------- Piyasa Nabzı (hero) ----------

function MarketPulseHero() {
  const { data: pulse } = useMarketPulse();
  const { data: cbbi } = useCbbi();

  if (!pulse || pulse.confidence == null) {
    return (
      <ToolCard title="Piyasa Nabzı" icon={Radar} accent="purple" className="sm:col-span-2 lg:col-span-3">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      </ToolCard>
    );
  }

  const pct = Math.round(pulse.confidence * 100);
  const color = pct > 70 ? "var(--danger)" : pct > 40 ? "var(--warning)" : "var(--success)";

  return (
    <ToolCard title="Piyasa Nabzı" icon={Radar} accent="purple" className="sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-center gap-6">
        <CircularProgress value={pct} color={color} label="Confidence" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-card-title-md text-foreground">{pulse.classification}</p>
          <p className="mt-1 text-body-xs text-muted-foreground">
            {pulse.totalCount} göstergeden {pulse.hotCount} tanesi tepe bölgesinde (CBBI composite skoru %{pct})
          </p>
          {cbbi?.price != null && (
            <p className="mt-1 text-body-xs text-muted-foreground">Referans BTC fiyatı: {fmtUsd(cbbi.price)}</p>
          )}
        </div>
      </div>
    </ToolCard>
  );
}

// ---------- Ana döngü/değerleme göstergeleri ----------

function MvrvZscoreCard() {
  const { data } = useCycleSnapshot();
  if (!data) return <LoadingCard title="MVRV Z-Score" icon={Gauge} accent="purple" />;
  const v = data.mvrvZscore;
  const zone: Zone = v == null ? "neutral" : v > 7 ? "hot" : v > 3 ? "warm" : v > 0 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="MVRV Z-Score"
      icon={Gauge}
      accent="purple"
      value={fmtNum(v)}
      zone={zone}
      subtitle="Piyasa değeri / gerçekleşen değer sapması"
    />
  );
}

function PiCycleCard() {
  const { data } = useCycleSnapshot();
  if (!data) return <LoadingCard title="Pi Cycle Top" icon={TrendingUp} accent="danger" />;
  const pi = data.piCycle;
  const ratio = pi?.sma111 != null && pi?.sma350x2 ? pi.sma111 / pi.sma350x2 : null;
  const zone: Zone = pi?.crossed ? "hot" : ratio != null && ratio > 0.9 ? "warm" : "neutral";
  return (
    <IndicatorCard
      title="Pi Cycle Top Indicator"
      icon={TrendingUp}
      accent="danger"
      value={ratio != null ? `${(ratio * 100).toFixed(0)}%` : "—"}
      zone={zone}
      subtitle={pi?.sma111 != null ? `111GO: ${fmtUsd(pi.sma111)} · 350GOx2: ${fmtUsd(pi.sma350x2)}` : undefined}
    />
  );
}

function PuellMultipleCard() {
  const { data } = useCycleSnapshot();
  if (!data) return <LoadingCard title="Puell Multiple" icon={Coins} accent="warning" />;
  const v = data.puellMultiple;
  const zone: Zone = v == null ? "neutral" : v > 4 ? "hot" : v > 1.5 ? "warm" : v > 0.5 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Puell Multiple"
      icon={Coins}
      accent="warning"
      value={fmtNum(v)}
      zone={zone}
      subtitle="Günlük madenci geliri / 365 günlük ortalama"
    />
  );
}

function MayerMultipleCard() {
  const { data } = useCycleSnapshot();
  if (!data) return <LoadingCard title="Mayer Multiple" icon={Scale} accent="primary" />;
  const v = data.mayerMultiple;
  const zone: Zone = v == null ? "neutral" : v > 2.4 ? "hot" : v > 1.4 ? "warm" : v > 0.8 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Mayer Multiple"
      icon={Scale}
      accent="primary"
      value={fmtNum(v)}
      zone={zone}
      subtitle="Fiyat / 200 günlük ortalama"
    />
  );
}

function Ahr999Card() {
  const { data } = useAhr999();
  if (!data) return <LoadingCard title="AHR999 Index" icon={Target} accent="success" />;
  const v = data.value;
  const zone: Zone = v == null ? "neutral" : v > 4 ? "hot" : v > 1.2 ? "warm" : v > 0.45 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="AHR999 Index"
      icon={Target}
      accent="success"
      value={fmtNum(v, 3)}
      zone={zone}
      subtitle="<0.45 dip fırsatı · 0.45-1.2 DCA bölgesi · >4 tepe"
    />
  );
}

function RainbowChartCard() {
  const { data } = useCycleMacro();
  if (!data?.rainbow) return <LoadingCard title="Bitcoin Rainbow Chart" icon={Rainbow} accent="purple" />;
  const idx = data.rainbow.bandIndex ?? 0;
  const zone: Zone = idx >= 8 ? "hot" : idx >= 6 ? "warm" : idx >= 3 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Bitcoin Rainbow Chart"
      icon={Rainbow}
      accent="purple"
      value={data.rainbow.bandLabel ?? "—"}
      zone={zone}
      subtitle={data.rainbow.price != null ? `Güncel fiyat: ${fmtUsd(data.rainbow.price)}` : undefined}
    />
  );
}

function GoldenRatioCard() {
  const { data } = useCycleSnapshot();
  if (!data?.goldenRatio) return <LoadingCard title="Golden Ratio Multiplier" icon={Layers} accent="warning" />;
  const g = data.goldenRatio;
  const ratio = g.price != null && g.sma350 ? g.price / g.sma350 : null;
  const zone: Zone = ratio == null ? "neutral" : ratio > 3.236 ? "hot" : ratio > 2.618 ? "warm" : ratio > 1 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Golden Ratio Multiplier"
      icon={Layers}
      accent="warning"
      value={ratio != null ? `${fmtNum(ratio)}x` : "—"}
      zone={zone}
      subtitle={g.sma350 != null ? `350GO: ${fmtUsd(g.sma350)} · 2.618x hedef: ${fmtUsd(g.x2618)}` : undefined}
    />
  );
}

function RhodlRatioCard() {
  const { data } = useCycleSnapshot();
  const { data: cbbi } = useCbbi();
  if (!data) return <LoadingCard title="RHODL Ratio" icon={Waves} accent="danger" />;
  const zone = zoneFromNormalized(cbbi?.indicators.rhodl);
  return (
    <IndicatorCard
      title="RHODL Ratio"
      icon={Waves}
      accent="danger"
      value={fmtCompactUsd(data.rhodlRatio)}
      zone={zone}
      subtitle="Kısa/uzun vadeli tutucu maliyet oranı"
    />
  );
}

function ReserveRiskCard() {
  const { data } = useCycleSnapshot();
  const { data: cbbi } = useCbbi();
  if (!data) return <LoadingCard title="Reserve Risk" icon={Landmark} accent="success" />;
  const zone = zoneFromNormalized(cbbi?.indicators.reserveRisk);
  return (
    <IndicatorCard
      title="Reserve Risk"
      icon={Landmark}
      accent="success"
      value={fmtNum(data.reserveRisk, 5)}
      zone={zone}
      subtitle="Uzun vadeli tutucu güveni / fiyat riski"
    />
  );
}

function TerminalPriceCard() {
  const { data } = useCycleMacro();
  if (!data) return <LoadingCard title="Terminal Price" icon={Target} accent="purple" />;
  return (
    <IndicatorCard
      title="Terminal Price"
      icon={Target}
      accent="purple"
      value={fmtUsd(data.terminalPrice)}
      zone="neutral"
      subtitle="Gerçekleşen değerleme bazlı teorik tavan"
    />
  );
}

function Ma200WeekCard() {
  const { data } = useCycleSnapshot();
  if (!data?.ma200Week) return <LoadingCard title="200 Haftalık Ortalama" icon={LineChart} accent="primary" />;
  const m = data.ma200Week;
  const ratio = m.price != null && m.ma ? m.price / m.ma : null;
  const zone: Zone = ratio == null ? "neutral" : ratio < 1 ? "cold" : ratio > 3 ? "hot" : "neutral";
  return (
    <IndicatorCard
      title="200 Haftalık Ortalama"
      icon={LineChart}
      accent="primary"
      value={fmtUsd(m.ma)}
      zone={zone}
      subtitle={m.price != null ? `Güncel fiyat: ${fmtUsd(m.price)}` : undefined}
    />
  );
}

function TwoYearMaCard() {
  const { data } = useTwoYearMaMultiplier();
  if (!data) return <LoadingCard title="2 Yıllık MA Çarpanı" icon={LineChart} accent="warning" />;
  const v = data.value;
  const zone: Zone = v == null ? "neutral" : v > 4 ? "hot" : v > 2.5 ? "warm" : v > 1 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="2 Yıllık MA Çarpanı"
      icon={LineChart}
      accent="warning"
      value={v != null ? `${fmtNum(v)}x` : "—"}
      zone={zone}
      subtitle={data.ma730d != null ? `730G Ort.: ${fmtUsd(data.ma730d)} · 5x bant: ${fmtUsd(data.band5x)}` : undefined}
    />
  );
}

function M2GlobalCard() {
  const { data } = useCycleMacro();
  if (!data) return <LoadingCard title="M2 Global & Bitcoin" icon={Globe} accent="primary" />;
  return (
    <IndicatorCard
      title="M2 Global & Bitcoin"
      icon={Globe}
      accent="primary"
      value={fmtCompactUsd(data.m2global)}
      zone="neutral"
      subtitle="Küresel M2 para arzı (likidite korelasyonu)"
    />
  );
}

function MacroOscillatorCard() {
  const { data } = useCycleMacro();
  if (!data) return <LoadingCard title="Bitcoin Macro Oscillator" icon={Radar} accent="danger" />;
  const v = data.macroScore;
  const zone: Zone = v == null ? "neutral" : v > 70 ? "hot" : v > 40 ? "warm" : v > 15 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Bitcoin Macro Oscillator"
      icon={Radar}
      accent="danger"
      value={v != null ? `${v}` : "—"}
      zone={zone}
      subtitle="Hash Ribbons + 2Y maliyet bazlı composite skor"
    />
  );
}

function SsrCard() {
  const { data } = useCycleMacro();
  if (!data) return <LoadingCard title="Stablecoin Supply Ratio" icon={Percent} accent="success" />;
  const v = data.ssr;
  const zone: Zone = v == null ? "neutral" : v < 4 ? "hot" : v < 8 ? "neutral" : "cold";
  return (
    <IndicatorCard
      title="Stablecoin Supply Ratio"
      icon={Percent}
      accent="success"
      value={fmtNum(v)}
      zone={zone}
      subtitle="Düşük SSR = stablecoin alım gücü yüksek"
    />
  );
}

// ---------- Aylık getiri (seasonality) ----------

function SeasonalityCard() {
  const { data } = useCycleMacro();
  const monthly = data?.seasonalityMonthly;
  if (!monthly) return <LoadingCard title="Bitcoin Aylık Getiri" icon={TrendingUp} accent="primary" />;

  const entries = Object.entries(monthly).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return <LoadingCard title="Bitcoin Aylık Getiri" icon={TrendingUp} accent="primary" />;

  return (
    <ToolCard title="Bitcoin Aylık Getiri (tarihsel ortalama)" icon={TrendingUp} accent="primary" className="sm:col-span-2 lg:col-span-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {entries.map(([month, value]) => {
          const positive = value >= 0;
          const alpha = 0.15 + Math.min(Math.abs(value) / 25, 1) * 0.55;
          const rgb = positive ? "34,197,94" : "239,68,68";
          return (
            <div
              key={month}
              className="flex flex-col items-center justify-center rounded-lg p-2 text-center"
              style={{ backgroundColor: `rgba(${rgb},${alpha})` }}
            >
              <span className="text-body-xs text-white/90">{month.slice(0, 3)}</span>
              <span className="text-financial text-white">
                {positive ? "+" : ""}
                {value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

// ---------- RSI Heatmap ----------

function RsiHeatmapCard() {
  const { data } = useCycleRsiHeatmap();
  const rows = data ?? [];
  return (
    <ToolCard title="RSI Heatmap (Günlük, 14 periyot)" icon={Gauge} accent="warning">
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {rows.map((r) => {
          const overbought = r.rsi14 >= 70;
          const oversold = r.rsi14 <= 30;
          const className = overbought ? "text-danger" : oversold ? "text-success" : "text-muted-foreground";
          return (
            <div key={r.symbol} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card-hover">
              <span className="text-financial text-foreground/90">{displayTicker(r.symbol)}</span>
              <span className={`text-financial ${className}`}>{r.rsi14.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

// ---------- Long/Short oranı ----------

function LongShortRatioTable() {
  const { data } = useLongShortRatio();
  const rows = data ?? [];
  return (
    <ToolCard title="Long/Short Oran Analizi" icon={ArrowLeftRight} accent="primary">
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {rows.map((r) => {
          const longHeavy = r.longShortRatio >= 1;
          return (
            <div key={r.symbol} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card-hover">
              <span className="text-financial text-foreground/90">{displayTicker(r.symbol)}</span>
              <span className={`text-financial ${longHeavy ? "text-success" : "text-danger"}`}>
                {r.longShortRatio.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

// ---------- Borsa akışları ----------

function ExchangeFlowCards() {
  const { data } = useExchangeFlows();
  if (!data) {
    return (
      <ToolCard title="Borsa Akışları" icon={ArrowLeftRight} accent="danger" className="sm:col-span-2">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      </ToolCard>
    );
  }
  return (
    <ToolCard title="Borsa Akışları (Spot Inflow/Outflow, Bakiye)" icon={ArrowLeftRight} accent="danger" className="sm:col-span-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg card-inner p-3 text-body-xs">
          <p className="text-muted-foreground">Net Akış (BTC)</p>
          <p className={`mt-1 text-num-sm ${(data.netflowBtc ?? 0) >= 0 ? "text-danger" : "text-success"}`}>
            {data.netflowBtc != null ? fmtNum(data.netflowBtc) : "—"}
          </p>
        </div>
        <div className="rounded-lg card-inner p-3 text-body-xs">
          <p className="text-muted-foreground">Borsa Bakiyesi (BTC)</p>
          <p className="mt-1 text-num-sm text-foreground">{fmtCompactUsd(data.reserveBtc)}</p>
        </div>
        <div className="rounded-lg card-inner p-3 text-body-xs">
          <p className="text-muted-foreground">Giriş (USD)</p>
          <p className="mt-1 text-num-sm text-foreground">{fmtCompactUsd(data.inflowUsd)}</p>
        </div>
        <div className="rounded-lg card-inner p-3 text-body-xs">
          <p className="text-muted-foreground">Çıkış (USD)</p>
          <p className="mt-1 text-num-sm text-foreground">{fmtCompactUsd(data.outflowUsd)}</p>
        </div>
      </div>
      <p className="mt-3 text-body-xs text-muted-foreground">Net akış pozitifse borsalara giriş baskın (satış baskısı sinyali).</p>
    </ToolCard>
  );
}

// ---------- DCA Hesaplayıcı ----------

function DcaCalculatorCard() {
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState("7");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DcaResult | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await postDcaCalculator({
        amountUsd: parseFloat(amount),
        frequencyDays: parseInt(frequency, 10),
        startDate,
      });
      if ("error" in res) {
        setError("Bu tarih aralığı için veri bulunamadı (fiyat serisi ~4 yıl geriye gidiyor).");
      } else {
        setResult(res);
      }
    } catch {
      setError("Hesaplama sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolCard title="DCA Hesaplayıcı" icon={Calculator} accent="success" className="sm:col-span-2 lg:col-span-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-body-xs text-muted-foreground">Tutar (USD)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div>
          <label className="text-body-xs text-muted-foreground">Sıklık (gün)</label>
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div>
          <label className="text-body-xs text-muted-foreground">Başlangıç Tarihi</label>
          <input
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full rounded-lg bg-primary px-3 py-2 text-body-xs font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Hesaplanıyor..." : "Hesapla"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-body-xs text-danger">{error}</p>}

      {result && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Toplam Yatırım</p>
            <p className="mt-1 text-num-sm text-foreground">{fmtUsd(result.investedTotal)}</p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Güncel Değer</p>
            <p className="mt-1 text-num-sm text-foreground">{fmtUsd(result.currentValue)}</p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">ROI</p>
            <p className={`mt-1 text-num-sm ${result.roiPercent >= 0 ? "text-success" : "text-danger"}`}>
              {result.roiPercent >= 0 ? "+" : ""}
              {result.roiPercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Biriken BTC</p>
            <p className="mt-1 text-num-sm text-foreground">{result.btcAccumulated.toFixed(6)}</p>
          </div>
          <div className="rounded-lg card-inner p-3 text-body-xs">
            <p className="text-muted-foreground">Ort. Maliyet</p>
            <p className="mt-1 text-num-sm text-foreground">{fmtUsd(result.averageCost)}</p>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

// ---------- Ana bölüm ----------

export function CycleIndicatorsSection() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MarketPulseHero />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MvrvZscoreCard />
        <PiCycleCard />
        <PuellMultipleCard />
        <MayerMultipleCard />
        <Ahr999Card />
        <RainbowChartCard />
        <GoldenRatioCard />
        <RhodlRatioCard />
        <ReserveRiskCard />
        <TerminalPriceCard />
        <Ma200WeekCard />
        <TwoYearMaCard />
        <M2GlobalCard />
        <MacroOscillatorCard />
        <SsrCard />
      </div>

      <SeasonalityCard />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RsiHeatmapCard />
        <LongShortRatioTable />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ExchangeFlowCards />
      </div>

      <DcaCalculatorCard />
    </div>
  );
}

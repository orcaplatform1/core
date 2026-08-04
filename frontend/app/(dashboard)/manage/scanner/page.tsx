"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, TrendingUp, TrendingDown, Zap, AlertTriangle, LineChart, Clock, Coins, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { useAuth } from "@/context/auth-context";
import {
  useLastScan,
  useTriggerScan,
  useLivePrice,
  useTrackedSignals,
  type ScanSignal,
  type TrackedSignal,
  type ScanMarket,
  type TrendLabel,
  type SignalStatsBlock,
} from "@/lib/hooks/use-admin-scanner";

const STRENGTH_STYLES: Record<ScanSignal["strength"], { label: string; bg: string; color: string }> = {
  GUCLU: { label: "GÜÇLÜ", bg: "#22C55E22", color: "#22C55E" },
  ORTA: { label: "ORTA", bg: "#F39C3D22", color: "#F39C3D" },
  RISKLI: { label: "RİSKLİ", bg: "#EF444422", color: "#EF4444" },
};

const TREND_LABEL_STYLES: Record<TrendLabel, { label: string; bg: string; color: string }> = {
  PRO_TREND: { label: "Pro-Trend", bg: "#3B5BFF22", color: "#3B5BFF" },
  COUNTER_TREND: { label: "Counter-Trend", bg: "#8B5CF622", color: "#8B5CF6" },
};

function StatsCard({
  title,
  accentColor,
  stats,
}: {
  title: string;
  accentColor: string;
  stats: SignalStatsBlock;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-inner p-3 space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
        {title}
      </p>
      <div className="flex items-center gap-3 text-xs text-[#A8A6A0] flex-wrap">
        <span>Toplam: {stats.total}</span>
        <span className="text-[#22C55E]">Kazandı: {stats.wins}</span>
        <span className="text-[#EF4444]">Stop: {stats.losses}</span>
      </div>
      <p className="text-sm font-semibold text-[#F5F1EA]">
        {stats.winRate !== null ? `%${stats.winRate} başarı` : "Yetersiz veri"}
      </p>
    </div>
  );
}

function TrendBadge({ trendLabel }: { trendLabel: TrendLabel }) {
  const style = TREND_LABEL_STYLES[trendLabel];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function fmt(n: number) {
  const abs = Math.abs(n);
  let decimals: number;
  if (abs >= 100) decimals = 2;
  else if (abs >= 1) decimals = 4;
  else if (abs >= 0.01) decimals = 6;
  else if (abs >= 0.0001) decimals = 8;
  else decimals = 10;
  return n.toLocaleString("tr-TR", { maximumFractionDigits: decimals });
}

function CoinIcon({ symbol, bullish }: { symbol: string; bullish: boolean }) {
  const [level, setLevel] = useState(0);
  const base = symbol.replace(/USDT$/, "").toLowerCase();
  const sources = [
    `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/128/color/${base}.png`,
    `https://assets.coincap.io/assets/icons/${base}@2x.png`,
  ];
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shrink-0"
      style={{ backgroundColor: bullish ? "#22C55E22" : "#EF444422" }}
    >
      {level < sources.length ? (
        <img
          key={level}
          src={sources[level]}
          alt={symbol}
          className="h-6 w-6 object-contain"
          onError={() => setLevel((l) => l + 1)}
        />
      ) : bullish ? (
        <TrendingUp size={18} color="#22C55E" />
      ) : (
        <TrendingDown size={18} color="#EF4444" />
      )}
    </div>
  );
}
function SignalCard({ signal, market }: { signal: ScanSignal; market: ScanMarket }) {
  const strengthStyle = STRENGTH_STYLES[signal.strength];
  const bullish = signal.direction === "LONG";
  const { data: live } = useLivePrice(signal.symbol, true, market);
  const displayPrice = live?.price ?? signal.currentPrice;
  const liveStillValid =
    displayPrice == null
      ? true
      : displayPrice <= signal.entryZoneTop && displayPrice >= signal.entryZoneBottom;
  const liveDistancePercent =
    displayPrice == null || liveStillValid
      ? 0
      : displayPrice > signal.entryZoneTop
      ? Math.round(((displayPrice - signal.entryZoneTop) / signal.entryZoneTop) * 10000) / 100
      : Math.round(((signal.entryZoneBottom - displayPrice) / signal.entryZoneBottom) * 10000) / 100;

  return (
    <div className="glow-primary rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={signal.symbol} bullish={bullish} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#F5F1EA]">{signal.symbol}</p>
              {market === "CRYPTO" && (
                <ExternalLink
                  href={`https://www.binance.com/en/futures/${signal.symbol}`}
                  className="text-[#A8A6A0] hover:text-primary"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F0B90B">
                    <path d="M12 2 L15.5 5.5 L12 9 L8.5 5.5 Z" />
                    <path d="M5.5 8.5 L9 12 L5.5 15.5 L2 12 Z" />
                    <path d="M18.5 8.5 L22 12 L18.5 15.5 L15 12 Z" />
                    <path d="M12 15 L15.5 18.5 L12 22 L8.5 18.5 Z" />
                    <path d="M12 9 L14.5 11.5 L12 14 L9.5 11.5 Z" />
                  </svg>
                </ExternalLink>
              )}
            </div>
            <p className="text-xs text-[#A8A6A0]">{bullish ? "LONG" : "SHORT"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: strengthStyle.bg, color: strengthStyle.color }}
          >
            {strengthStyle.label}
          </span>
          <TrendBadge trendLabel={signal.trendLabel} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#3B5BFF33] bg-gradient-to-r from-[#3B5BFF14] to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#22C55E]" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]">Canlı</span>
        </div>
        <span className="font-mono text-base font-bold text-[#F5F1EA]">
          {displayPrice != null ? fmt(displayPrice) : "…"}
        </span>
      </div>

      {!signal.stillValid && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] px-3 py-2">
          <AlertTriangle size={14} color="#F39C3D" className="shrink-0" />
          <p className="text-xs text-[#F39C3D]">
            Bölgeden %{signal.distancePercent} uzakta, teyit et
          </p>
        </div>
      )}
      {signal.stillValid && !liveStillValid && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] px-3 py-2">
          <AlertTriangle size={14} color="#F39C3D" className="shrink-0" />
          <p className="text-xs text-[#F39C3D]">
            Canlı fiyat bölgeden %{liveDistancePercent} uzaklaştı, giriş için teyit et
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">Giriş Bölgesi</p>
          <p className="text-xs font-semibold text-[#F5F1EA]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">Stop</p>
          <p className="text-xs font-semibold text-[#EF4444]">{fmt(signal.stop)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">R:R</p>
          <p className="text-xs font-semibold text-[#F5F1EA]">1:{signal.rr}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#A8A6A0]">TP1</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp1)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#A8A6A0]">TP2</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#A8A6A0]">TP3</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp3)}</p>
        </div>
      </div>

      <div className="space-y-1">
        {signal.reasons.map((r, i) => (
          <p key={i} className="text-xs text-[#A8A6A0]">
            • {r}
          </p>
        ))}
      </div>

      {signal.aiCommentary && (
        <div className="rounded-lg border border-[#3B5BFF40] bg-[#3B5BFF11] p-3">
          <p className="text-xs text-[#A8A6A0]">{signal.aiCommentary}</p>
        </div>
      )}

      {signal.fundingRate !== null && (
        <p className="text-[10px] text-[#A8A6A0]">
          Funding rate: {(signal.fundingRate as number).toFixed(4)}%
        </p>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<TrackedSignal["status"], { label: string; bg: string; color: string }> = {
  WATCHING: { label: "IZLENIYOR", bg: "#A8A6A022", color: "#A8A6A0" },
  TRIGGERED: { label: "TETIKLENDI", bg: "#3B5BFF22", color: "#3B5BFF" },
  HIT_TP1: { label: "TP1 VURULDU", bg: "#22C55E22", color: "#22C55E" },
  HIT_TP2: { label: "TP2 VURULDU", bg: "#22C55E22", color: "#22C55E" },
  HIT_TP3: { label: "TP3 VURULDU", bg: "#22C55E22", color: "#22C55E" },
  HIT_STOP: { label: "STOP OLDU", bg: "#EF444422", color: "#EF4444" },
  EXPIRED: { label: "SURESI DOLDU", bg: "#F39C3D22", color: "#F39C3D" },
};

function TrackedSignalCard({ signal, market }: { signal: TrackedSignal; market: ScanMarket }) {
  const strengthStyle = STRENGTH_STYLES[signal.strength];
  const style = STATUS_STYLES[signal.status];
  const showStatusBadge = signal.status === "WATCHING" || signal.status === "TRIGGERED" || signal.status === "EXPIRED";
  const bullish = signal.direction === "LONG";
  const isOpen = signal.closedAt === null;
  const { data: live } = useLivePrice(signal.symbol, isOpen, market);
  const displayPrice = live?.price ?? null;
  const hitLevel =
    signal.status === "HIT_TP1" ? 1 : signal.status === "HIT_TP2" ? 2 : signal.status === "HIT_TP3" ? 3 : 0;
  const stopHit = signal.status === "HIT_STOP";
  const tpBoxClass = (level: number) =>
    hitLevel >= level
      ? "rounded-lg border border-[#22C55E40] bg-[#22C55E1A] p-2.5 text-center"
      : "rounded-lg border border-border bg-card-inner p-2.5 text-center";
  const stopBoxClass = stopHit
    ? "rounded-lg border border-[#EF444440] bg-[#EF44441A] p-2.5"
    : "rounded-lg border border-border bg-card-inner p-2.5";
  return (
    <div className="glow-primary rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={signal.symbol} bullish={bullish} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#F5F1EA]">{signal.symbol}</p>
              {market === "CRYPTO" && (
                <ExternalLink
                  href={`https://www.binance.com/en/futures/${signal.symbol}`}
                  className="text-[#A8A6A0] hover:text-primary"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F0B90B">
                    <path d="M12 2 L15.5 5.5 L12 9 L8.5 5.5 Z" />
                    <path d="M5.5 8.5 L9 12 L5.5 15.5 L2 12 Z" />
                    <path d="M18.5 8.5 L22 12 L18.5 15.5 L15 12 Z" />
                    <path d="M12 15 L15.5 18.5 L12 22 L8.5 18.5 Z" />
                    <path d="M12 9 L14.5 11.5 L12 14 L9.5 11.5 Z" />
                  </svg>
                </ExternalLink>
              )}
            </div>
            <p className="text-xs text-[#A8A6A0]">{bullish ? "LONG" : "SHORT"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {showStatusBadge && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {style.label}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: strengthStyle.bg, color: strengthStyle.color }}
          >
            {strengthStyle.label}
          </span>
          <TrendBadge trendLabel={signal.trendLabel} />
        </div>
      </div>
      {isOpen && (
        <div className="flex items-center justify-between rounded-xl border border-[#3B5BFF33] bg-gradient-to-r from-[#3B5BFF14] to-transparent px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22C55E]" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]">Canlı</span>
          </div>
          <span className="font-mono text-base font-bold text-[#F5F1EA]">
            {displayPrice != null ? fmt(displayPrice) : "…"}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">Giriş Bölgesi</p>
          <p className="text-xs font-semibold text-[#F5F1EA]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className={stopBoxClass}>
          <p className="text-[10px] text-[#A8A6A0]">Stop</p>
          <p className="text-xs font-semibold text-[#EF4444]">{fmt(signal.stop)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">R:R</p>
          <p className="text-xs font-semibold text-[#F5F1EA]">1:{signal.rr}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#A8A6A0]">Oluşturuldu</p>
          <p className="text-xs font-semibold text-[#F5F1EA]">
            {new Date(signal.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={tpBoxClass(1)}>
          <p className="text-[10px] text-[#A8A6A0]">TP1</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp1)}</p>
        </div>
        <div className={tpBoxClass(2)}>
          <p className="text-[10px] text-[#A8A6A0]">TP2</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp2)}</p>
        </div>
        <div className={tpBoxClass(3)}>
          <p className="text-[10px] text-[#A8A6A0]">TP3</p>
          <p className="text-xs font-semibold text-[#22C55E]">{fmt(signal.tp3)}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminScannerPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [style, setStyle] = useState<"SWING" | "DAY">("SWING");
  const [market, setMarket] = useState<ScanMarket>("CRYPTO");
  const { data: lastScan, isLoading } = useLastScan(style, market);
  const { data: tracked } = useTrackedSignals(style, market);
  const triggerScan = useTriggerScan(style, market);

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function handleScan() {
    try {
      await triggerScan.mutateAsync();
      toast.success("Tarama kuyruğa eklendi, birkaç dakika içinde sonuç güncellenecek");
    } catch (err: any) {
      toast.error(err?.message ?? "Tarama başlatılamadı");
    }
  }

  const results = lastScan?.results;
  const allCrypto = results?.crypto ?? [];
  const activeSignals = allCrypto.filter((s) => s.stillValid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">AI Chart Scanner</h1>
          <p className="text-sm text-[#A8A6A0]">
            Sadece kişisel kullanım — öğrencilere kapalı.{" "}
            {market === "CRYPTO"
              ? "Binance top 200 kripto, 15 dakikada bir otomatik tarama."
              : "Yahoo Finance forex majörleri + emtia (XAUUSD, XAGUSD, BRENT, WTI...), 15 dakikada bir otomatik tarama."}
          </p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A8A6A0]">Strateji</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card-inner p-1.5 sm:max-w-md">
            <button
              type="button"
              onClick={() => setStyle("SWING")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                style === "SWING"
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <LineChart size={16} />
              Swing Trade
            </button>
            <button
              type="button"
              onClick={() => setStyle("DAY")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                style === "DAY"
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Clock size={16} />
              Day Trade
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A8A6A0]">Piyasa</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card-inner p-1.5 sm:max-w-md">
            <button
              type="button"
              onClick={() => setMarket("CRYPTO")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                market === "CRYPTO"
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Coins size={16} />
              Kripto
            </button>
            <button
              type="button"
              onClick={() => setMarket("FOREX")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                market === "FOREX"
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Globe2 size={16} />
              Forex
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleScan} disabled={triggerScan.isPending} className="h-10">
          <Zap size={16} className="mr-2" />
          {triggerScan.isPending ? "Kuyruğa ekleniyor..." : "Şimdi Tara"}
        </Button>
        {results?.scannedAt && (
          <span className="text-xs text-[#A8A6A0]">
            Son tarama: {new Date(results.scannedAt).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <>
          {activeSignals.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
              <Zap size={28} className="mx-auto text-[#A8A6A0]" />
              <p className="text-sm text-[#A8A6A0]">
                Şu an aktif (girilebilir) sinyal yok. Bu normal — filtreler sıkı, her taramada çıkmayabilir.
              </p>
            </div>
          )}
          {activeSignals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#F5F1EA]">Aktif Sinyaller ({activeSignals.length})</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {activeSignals.map((s) => (
                  <SignalCard key={s.symbol} signal={s} market={market} />
                ))}
              </div>
            </div>
          )}
          {tracked && tracked.signals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#F5F1EA]">
                Takip Edilenler ({tracked.signals.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <StatsCard title="Toplam" accentColor="#F5F1EA" stats={tracked.stats} />
                <StatsCard title="Pro-Trend" accentColor="#3B5BFF" stats={tracked.stats.proTrend} />
                <StatsCard title="Counter-Trend" accentColor="#8B5CF6" stats={tracked.stats.counterTrend} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tracked.signals.map((s) => (
                  <TrackedSignalCard key={s.id} signal={s} market={market} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

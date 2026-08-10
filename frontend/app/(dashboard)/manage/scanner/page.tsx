"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Coins,
  Globe2,
  Sparkles,
  X,
  Target,
  Clock,
  Layers,
  Filter,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
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
  type SignalStatsBlock,
} from "@/lib/hooks/use-admin-scanner";


const STRENGTH_STYLES: Record<ScanSignal["strength"], { label: string; bg: string; color: string }> = {
  GUCLU: { label: "GÜÇLÜ", bg: "#22C55E22", color: "#22C55E" },
  ORTA: { label: "ORTA", bg: "#F39C3D22", color: "#F39C3D" },
  RISKLI: { label: "RİSKLİ", bg: "#EF444422", color: "#EF4444" },
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
  const rNetColor = stats.rNet > 0 ? "#22C55E" : stats.rNet < 0 ? "#EF4444" : "#A8A6A0";
  return (
    <div className="rounded-xl border border-border bg-card-inner p-3 space-y-1.5">
      <p className="text-badge uppercase tracking-wider" style={{ color: accentColor }}>
        {title}
      </p>
      <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
        <span>Toplam: {stats.total}</span>
        <span className="text-[#22C55E]">Kazandı: {stats.wins}</span>
        <span className="text-[#EF4444]">Stop: {stats.losses}</span>
        <span className="font-semibold text-[#F5F1EA]">
          Başarı: {stats.winRate !== null ? `%${stats.winRate}` : "Yetersiz veri"}
        </span>
      </div>
      <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap border-t border-border pt-1.5">
        <span>
          TP1: {stats.tp1.count}
          {stats.tp1.count > 0 && <span className="text-[#22C55E]"> (+{stats.tp1.r.toFixed(2)}R)</span>}
        </span>
        <span>
          TP2: {stats.tp2.count}
          {stats.tp2.count > 0 && <span className="text-[#22C55E]"> (+{stats.tp2.r.toFixed(2)}R)</span>}
        </span>
        <span>
          TP3: {stats.tp3.count}
          {stats.tp3.count > 0 && <span className="text-[#22C55E]"> (+{stats.tp3.r.toFixed(2)}R)</span>}
        </span>
        <span>
          Stop: {stats.stopped.count}
          {stats.stopped.count > 0 && <span className="text-[#EF4444]"> (-{stats.stopped.r.toFixed(2)}R)</span>}
        </span>
        <span className="font-semibold" style={{ color: rNetColor }}>
          Toplam R: {stats.rNet > 0 ? "+" : ""}
          {stats.rNet.toFixed(2)}R
        </span>
      </div>
    </div>
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
              <p className="text-card-title-sm text-[#F5F1EA]">{signal.symbol}</p>
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
            <p className="text-body-xs text-[#A8A6A0]">{bullish ? "LONG" : "SHORT"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-badge"
            style={{ backgroundColor: strengthStyle.bg, color: strengthStyle.color }}
          >
            {strengthStyle.label}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#3B5BFF33] bg-gradient-to-r from-[#3B5BFF14] to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#22C55E]" />
          </span>
          <span className="text-badge uppercase tracking-wider text-[#22C55E]">Canlı</span>
        </div>
        <span className="text-num-sm text-[#F5F1EA]">
          {displayPrice != null ? fmt(displayPrice) : "…"}
        </span>
      </div>

      {!signal.stillValid && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] px-3 py-2">
          <AlertTriangle size={14} color="#F39C3D" className="shrink-0" />
          <p className="text-body-xs text-[#F39C3D]">
            Bölgeden %{signal.distancePercent} uzakta, teyit et
          </p>
        </div>
      )}
      {signal.stillValid && !liveStillValid && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] px-3 py-2">
          <AlertTriangle size={14} color="#F39C3D" className="shrink-0" />
          <p className="text-body-xs text-[#F39C3D]">
            Canlı fiyat bölgeden %{liveDistancePercent} uzaklaştı, giriş için teyit et
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">Giriş Bölgesi</p>
          <p className="text-financial text-[#F5F1EA]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">Stop</p>
          <p className="text-financial text-[#EF4444]">{fmt(signal.stop)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">R:R</p>
          <p className="text-financial text-[#F5F1EA]">1:{signal.rr}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-body-xs text-[#A8A6A0]">TP1</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp1)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-body-xs text-[#A8A6A0]">TP2</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-body-xs text-[#A8A6A0]">TP3</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp3)}</p>
        </div>
      </div>

      <div className="space-y-1">
        {signal.reasons.map((r, i) => (
          <p key={i} className="text-body-xs text-[#A8A6A0]">
            • {r}
          </p>
        ))}
      </div>

      {signal.aiCommentary && (
        <div className="rounded-lg border border-[#3B5BFF40] bg-[#3B5BFF11] p-3">
          <p className="text-body-xs text-[#A8A6A0]">{signal.aiCommentary}</p>
        </div>
      )}

      {signal.fundingRate !== null && (
        <p className="text-body-xs text-[#A8A6A0]">
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
  const stopAtBreakeven = hitLevel >= 1 && !stopHit;
  const tpBoxClass = (level: number) =>
    hitLevel >= level
      ? "rounded-lg border border-[#22C55E40] bg-[#22C55E1A] p-2.5 text-center"
      : "rounded-lg border border-border bg-card-inner p-2.5 text-center";
  const stopBoxClass = stopHit
    ? "rounded-lg border border-[#EF444440] bg-[#EF44441A] p-2.5"
    : "rounded-lg border border-border bg-card-inner p-2.5";

  // Gerceklesen R sonucu - backend'deki computeSignalStats ile BIREBIR ayni
  // model (bkz. scanner.service.ts): TP1 her zaman 1R'da, orada pozisyonun
  // %50'si bankaya yatirilip stop basabasa cekiliyor - geri kalan %50 TP3'e
  // (market'e ozgu R kati, sig.rr) ya da basabasa (0R) kapaniyor. HIT_STOP
  // sadece TP1 hic bankaya yatirilmadan olusabiliyor, yani tam 1R kayip.
  const realized =
    signal.closedAt === null
      ? null
      : signal.status === "HIT_STOP"
        ? { won: 0, lost: 1, net: -1 }
        : signal.status === "HIT_TP1" || signal.status === "HIT_TP2"
          ? { won: 0.5, lost: 0, net: 0.5 }
          : signal.status === "HIT_TP3"
            ? { won: 0.5 + 0.5 * signal.rr, lost: 0, net: 0.5 + 0.5 * signal.rr }
            : null;
  const realizedColor = realized ? (realized.net > 0 ? "#22C55E" : realized.net < 0 ? "#EF4444" : "#A8A6A0") : "#A8A6A0";

  // Canli fiyata gore ANLIK uyari - resmi durumdan (hitLevel/status) BAGIMSIZ,
  // backend'in 15dk'lik tarama dongusunu beklemeden "su an ne oluyor" gorseli.
  // Resmi kayit/istatistik yine sadece backend guncellemesiyle degisir, bu
  // sadece erken gorsel bildirim.
  let liveAlert: { text: string; color: string } | null = null;
  if (isOpen && displayPrice != null) {
    // signal.stop DB'deki GUNCEL stop - TP1 resmi olarak islendiyse zaten
    // basabasa cekilmis oluyor, henuz islenmediyse hala orijinal stop.
    const liveStopped = bullish ? displayPrice <= signal.stop : displayPrice >= signal.stop;
    if (liveStopped) {
      liveAlert = hitLevel >= 1
        ? { text: "⚡ Canlı: fiyat başabaşa değdi - resmi kapanış bekleniyor (TP1 sayesinde kazanç)", color: "#3B5BFF" }
        : { text: "⚡ Canlı: fiyat stop seviyesine değdi - resmi kapanış bekleniyor", color: "#EF4444" };
    } else {
      const liveLevel = bullish
        ? displayPrice >= signal.tp3 ? 3 : displayPrice >= signal.tp2 ? 2 : displayPrice >= signal.tp1 ? 1 : 0
        : displayPrice <= signal.tp3 ? 3 : displayPrice <= signal.tp2 ? 2 : displayPrice <= signal.tp1 ? 1 : 0;
      if (liveLevel > hitLevel) {
        liveAlert = { text: `⚡ Canlı: TP${liveLevel} geçildi - resmi güncelleme bekleniyor`, color: "#22C55E" };
      }
    }
  }

  // Giris fiyati baz alinarak mesafe %'si ve R katsayisi - stop mesafesi
  // 1R kabul edilir (tanim geregi), digerleri buna orantilanir.
  const entry = signal.entry;
  const riskDistance = entry != null ? Math.abs(entry - signal.stop) : null;
  const distancePct = (level: number) => (entry != null ? (Math.abs(level - entry) / entry) * 100 : null);
  const rMultiple = (level: number) =>
    entry != null && riskDistance && riskDistance > 0 ? Math.abs(level - entry) / riskDistance : null;
  const fmtPct = (level: number) => {
    const p = distancePct(level);
    return p != null ? `%${p.toFixed(2)}` : "—";
  };
  const fmtR = (level: number, sign: "+" | "-") => {
    const r = rMultiple(level);
    return r != null ? `${sign}${r.toFixed(2)}R` : "—";
  };
  return (
    <div className="glow-primary rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={signal.symbol} bullish={bullish} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-card-title-sm text-[#F5F1EA]">{signal.symbol}</p>
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
            <p className="text-body-xs text-[#A8A6A0]">{bullish ? "LONG" : "SHORT"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {showStatusBadge && (
            <span
              className="rounded-full px-2 py-0.5 text-badge"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {style.label}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-badge"
            style={{ backgroundColor: strengthStyle.bg, color: strengthStyle.color }}
          >
            {strengthStyle.label}
          </span>
        </div>
      </div>
      {isOpen && (
        <div className="flex items-center justify-between rounded-xl border border-[#3B5BFF33] bg-gradient-to-r from-[#3B5BFF14] to-transparent px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22C55E]" />
            </span>
            <span className="text-badge uppercase tracking-wider text-[#22C55E]">Canlı</span>
          </div>
          <span className="text-num-sm text-[#F5F1EA]">
            {displayPrice != null ? fmt(displayPrice) : "…"}
          </span>
        </div>
      )}
      {liveAlert && (
        <div
          className="rounded-xl border px-3 py-2 text-body-xs font-medium"
          style={{ borderColor: `${liveAlert.color}40`, backgroundColor: `${liveAlert.color}1A`, color: liveAlert.color }}
        >
          {liveAlert.text}
        </div>
      )}
      {realized && (
        <div
          className="flex items-center justify-between rounded-xl border px-3 py-2"
          style={{ borderColor: `${realizedColor}40`, backgroundColor: `${realizedColor}14` }}
        >
          <span className="text-body-xs text-[#A8A6A0]">
            Kazanılan: <span className="font-medium text-[#22C55E]">+{realized.won.toFixed(2)}R</span>
            {" · "}Kaybedilen: <span className="font-medium text-[#EF4444]">-{realized.lost.toFixed(2)}R</span>
          </span>
          <span className="text-financial font-semibold" style={{ color: realizedColor }}>
            Toplam: {realized.net > 0 ? "+" : ""}
            {realized.net.toFixed(2)}R
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">Giriş Bölgesi</p>
          <p className="text-financial text-[#F5F1EA]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className={stopBoxClass}>
          <p className="text-body-xs text-[#A8A6A0]">
            Stop {stopAtBreakeven && <span className="text-[#3B5BFF]">(Girişte - TP1 alındı, kalan risksiz)</span>}
          </p>
          <p className="text-financial text-[#EF4444]">{fmt(signal.stop)}</p>
          <p className="text-body-xs text-[#A8A6A0]">
            {fmtPct(signal.stop)} · {fmtR(signal.stop, "-")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">R:R</p>
          <p className="text-financial text-[#F5F1EA]">1:{signal.rr}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-body-xs text-[#A8A6A0]">Oluşturuldu</p>
          <p className="text-financial text-[#F5F1EA]">
            {new Date(signal.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={tpBoxClass(1)}>
          <p className="text-body-xs text-[#A8A6A0]">TP1</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp1)}</p>
          <p className="text-body-xs text-[#A8A6A0]">
            {fmtPct(signal.tp1)} · {fmtR(signal.tp1, "+")}
          </p>
        </div>
        <div className={tpBoxClass(2)}>
          <p className="text-body-xs text-[#A8A6A0]">TP2</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp2)}</p>
          <p className="text-body-xs text-[#A8A6A0]">
            {fmtPct(signal.tp2)} · {fmtR(signal.tp2, "+")}
          </p>
        </div>
        <div className={tpBoxClass(3)}>
          <p className="text-body-xs text-[#A8A6A0]">TP3</p>
          <p className="text-financial text-[#22C55E]">{fmt(signal.tp3)}</p>
          <p className="text-body-xs text-[#A8A6A0]">
            {fmtPct(signal.tp3)} · {fmtR(signal.tp3, "+")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-[#3B5BFF1A] text-[#3B5BFF]">
          {icon}
        </span>
        <h3 className="text-card-title-sm text-[#F5F1EA]">{title}</h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-lg border border-border bg-card-inner p-3">
      <p className="mb-1.5 text-body-xs font-semibold uppercase tracking-wider text-[#8FB8FF]">{title}</p>
      <div className="text-body-xs text-[#D6D3CB]">{children}</div>
    </div>
  );
}

function AboutModulePanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="premium-glow-card relative my-4 w-full max-w-3xl space-y-6 bg-card p-5 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#A8A6A0] transition-colors hover:bg-white/10 hover:text-[#F5F1EA]"
        >
          <X size={18} />
        </button>

        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#3B5BFF]" />
            <h2 className="text-h2 text-[#F5F1EA]">Orca ACS — Automatic Chart Scanner</h2>
          </div>
          <p className="text-body-sm text-[#A8A6A0]">
            Kural bazlı (rule-based), tamamen matematiksel/deterministik bir ICT/SMC tarama motoru.
            "AI" burada sadece sinyal zaten bulunduktan <b className="text-[#F5F1EA]">SONRA</b> Türkçe bir
            senaryo yorumu yazar (Claude Haiku) — sinyalin bulunmasına, yönüne, giriş/stop/TP
            seviyelerine veya hangi filtreden geçtiğine hiç karışmaz. Karar mekanizmasının tamamı
            aşağıdaki kurallardan oluşur.
          </p>
        </div>

        <Section icon={<Layers size={16} />} title="Strateji">
          <SubBlock title="Kripto — ICT/SMC Breakout &amp; Retest (Long-only)">
            <ul className="list-inside list-disc space-y-1">
              <li>MSB (Market Structure Break): son kapanan 15dk mum, önceki 5 mumun en yükseğini yukarı yönlü kırıp üzerinde kapanır.</li>
              <li>Hacim Onayı: kırılım mumunun hacmi, son 20 mum ortalamasının en az 1.2 katı.</li>
              <li>FVG (Fair Value Gap): kırılım yapısındaki 3 mumluk boşluk — giriş bölgesini oluşturur.</li>
              <li>Trend Filtresi: fiyat 15dk EMA200 üzerinde olmalı.</li>
            </ul>
          </SubBlock>
          <SubBlock title="Forex — ICT Likidite Süpürme">
            <ul className="list-inside list-disc space-y-1">
              <li>Önceki seansın en düşük seviyesinin altına bir mum fitilinin sarkması (likidite süpürme).</li>
              <li>15dk MSB: süpürmeden sonraki kırılım mumu, önceki 5 mumun tepesini yukarı yönlü kırar.</li>
              <li>FVG girişi (kripto ile aynı 3 mumluk mantık).</li>
              <li>Bilinen yüksek etkili haber günlerinde ve TSİ 23:55–01:05 (banka gün sonu spread genişlemesi) tarama tamamen atlanır.</li>
              <li>DXY kendi 15dk EMA50 üzerindeyse EURUSD/GBPUSD sinyaline bilgi notu eklenir — sinyal engellenmez, sadece uyarı.</li>
            </ul>
          </SubBlock>
        </Section>

        <Section icon={<Filter size={16} />} title="Filtreler">
          <ul className="list-inside list-disc space-y-1.5 text-body-xs text-[#D6D3CB]">
            <li><b className="text-[#F5F1EA]">Evren:</b> Binance top 75 USDT paritesi (24s hacme göre), stablecoin taban varlıklı çiftler (USDC, BUSD, DAI, TUSD, FDUSD, USDP, PYUSD, USDD, GUSD) tamamen hariç.</li>
            <li><b className="text-[#F5F1EA]">BTC Piyasa Filtresi:</b> BTC'nin son 15dk mumu %1.5+ düşerse (ani çöküş) VEYA BTC kendi 1 saatlik EMA50'sinin altındaysa, o taramada hiç LONG sinyali üretilmez.</li>
            <li><b className="text-[#F5F1EA]">Korelasyon Filtresi:</b> adaylar arası son 60 mumun getiri korelasyonu %88'i aşarsa (aynı sektör/benzer hareket eden varlık), ikinci sembol elenir.</li>
            <li><b className="text-[#F5F1EA]">Yeniden Tetiklenme Bekleme Süresi:</b> bir sinyal kapandıktan (TP/Stop/süre aşımı fark etmeksizin) sonra aynı sembol için 24 saat yeni sinyal açılmaz — fiyatın aynı seviyede çırpınıp (whipsaw) art arda sinyal üretmesini engeller.</li>
          </ul>
          <div className="mt-2.5 rounded-lg border border-[#3B5BFF33] bg-[#3B5BFF0D] p-3 text-body-xs text-[#A8A6A0]">
            <b className="text-[#3B5BFF]">Neden BTC filtresi var?</b> 60 günlük backtest: BTC yükseliş trendindeyken tetiklenen sinyaller ortalama %43.3 win rate / +0.30R beklenti veriyor; BTC düşüş trendindeyken bu %36.2 win rate / +0.09R'a düşüyor. Filtre sinyal sayısını ~%28 azaltıyor ama kaliteyi belirgin yükseltiyor — bilinçli bir tercih.
          </div>
        </Section>

        <Section icon={<Target size={16} />} title="Giriş / Stop / TP Sistemi">
          <div className="space-y-2 text-body-xs text-[#D6D3CB]">
            <p>
              <b className="text-[#F5F1EA]">Giriş:</b> fiyat FVG bölgesine geri çekilince tetiklenir (kripto: bölgenin üst sınırı; forex: bölgenin %50 orta noktası). Fiyat henüz bölgeye girmemişse sinyal <b className="text-[#A8A6A0]">İZLENİYOR</b> durumunda en fazla 3 gün takip edilir.
            </p>
            <p>
              <b className="text-[#F5F1EA]">Stop:</b> yapısal swing low/high − ATR(14) × 0.5.
            </p>
            <p>
              <b className="text-[#22C55E]">TP1</b> = Giriş + Risk × 1 (net 1:1) → pozisyonun %50'si kapanır, <b className="text-[#F5F1EA]">kalan %50 için stop girişe (başabaşa) çekilir.</b>
            </p>
            <p>
              <b className="text-[#22C55E]">TP2</b> = Giriş + Risk × 1.5 (kripto) / × 2 (forex) → ara hedef, bilgi amaçlı.
            </p>
            <p>
              <b className="text-[#22C55E]">TP3 (final)</b> = Giriş + Risk × 2 (kripto) / × 3 (forex) → kalan pozisyon burada tamamen kapanır.
            </p>
            <div className="rounded-lg border border-[#3B5BFF33] bg-[#3B5BFF0D] p-3">
              <b className="text-[#3B5BFF]">Önemli:</b> TP1 alındıktan sonra fiyat başabaşa (girişe) geri dönerse bu <b className="text-[#F5F1EA]">KAYIP sayılmaz</b> — TP1'in %50'lik dilimindeki kâr zaten bankaya yatırılmıştır, kalan %50 sadece riske girmeden (0R) kapanır. Toplam işlem net kârlı sonuçlanır.
            </div>
          </div>
        </Section>

        <Section icon={<Clock size={16} />} title="Sinyal Durumları">
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "İZLENİYOR", color: "#A8A6A0", desc: "Yapısal olarak onaylandı, fiyatın giriş bölgesine gelmesi bekleniyor (max 3 gün)." },
              { label: "TETİKLENDİ", color: "#3B5BFF", desc: "Fiyat giriş bölgesine girdi, pozisyon açık kabul edilir." },
              { label: "TP1 / TP2 / TP3 VURULDU", color: "#22C55E", desc: "İlgili hedefe ulaşıldı." },
              { label: "STOP OLDU", color: "#EF4444", desc: "TP1'e hiç ulaşmadan orijinal stop'a çarptı — gerçek kayıp." },
              { label: "SÜRESİ DOLDU", color: "#F39C3D", desc: "Giriş bölgesine hiç gelmeden (3 gün) veya tetiklendikten sonra (1 gün, day-trade) sonuçlanmadan zaman aşımına uğradı." },
            ].map((s) => (
              <div key={s.label} className="w-full rounded-lg border border-border bg-card-inner p-2.5 sm:w-[calc(50%-3px)]">
                <span
                  className="mb-1 inline-block rounded-full px-2 py-0.5 text-badge"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  {s.label}
                </span>
                <p className="text-body-xs text-[#A8A6A0]">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<BarChart3 size={16} />} title="Başarı Ölçümü (Win Rate)">
          <p className="text-body-xs text-[#D6D3CB]">
            <b className="text-[#22C55E]">Kazandı:</b> kapanmış VE en az TP1'e ulaşmış sinyaller (TP1 sonrası, yukarıdaki başabaş kuralı gereği kayıp riski yoktur — TP1/TP2/TP3'ün hepsi kazanç sayılır).{" "}
            <b className="text-[#EF4444]">Kayıp:</b> STOP OLDU durumundaki sinyaller (TP1'e hiç ulaşmadan orijinal stop'a çarpanlar).{" "}
            Win Rate = Kazandı / (Kazandı + Kayıp). İZLENİYOR/TETİKLENDİ (hâlâ açık) ve SÜRESİ DOLDU durumundaki sinyaller bu orana dahil edilmez.
          </p>
        </Section>

        <Section icon={<Zap size={16} />} title="Diğer">
          <ul className="list-inside list-disc space-y-1 text-body-xs text-[#D6D3CB]">
            <li>Her sinyal kartındaki Binance ikonu, ilgili paritenin Binance Futures trade sayfasına doğrudan götürür.</li>
            <li>Kartlardaki canlı fiyat 3 saniyede bir güncellenir; resmi durum (TP/Stop tetiklenmesi, win-rate istatiği) ise 15 dakikalık tarama döngüsünde güncellenir — ikisi arasında fark varsa kartta anlık bir uyarı belirir.</li>
            <li>Tarama 15 dakikada bir otomatik çalışır, sağ üstteki butonla manuel de tetiklenebilir.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

export default function AdminScannerPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [market, setMarket] = useState<ScanMarket>("CRYPTO");
  const [showAbout, setShowAbout] = useState(false);
  const { data: lastScan, isLoading } = useLastScan(market);
  const { data: tracked } = useTrackedSignals(market);
  const triggerScan = useTriggerScan(market);

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
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
          <h1 className="text-h1 text-[#F5F1EA]">Orca ACS</h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className="rounded-full px-2.5 py-1 text-badge uppercase tracking-wider"
              style={{ backgroundColor: "#3B5BFF22", color: "#3B5BFF" }}
            >
              Kullanım durumu: Yalnızca yönetici
            </span>
            <PremiumGlowButton
              type="button"
              size="sm"
              onClick={() => setShowAbout(true)}
              className="gap-1.5 text-badge"
            >
              <Sparkles size={13} />
              Modül Hakkında
            </PremiumGlowButton>
          </div>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>
      {showAbout && <AboutModulePanel onClose={() => setShowAbout(false)} />}

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-badge uppercase tracking-wider text-[#A8A6A0]">Piyasa</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card-inner p-1.5 sm:max-w-md">
            <button
              type="button"
              onClick={() => setMarket("CRYPTO")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-body-sm transition-all duration-200 ${
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
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-body-sm transition-all duration-200 ${
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
          <span className="text-body-xs text-[#A8A6A0]">
            Son tarama: {new Date(results.scannedAt).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <>
          {activeSignals.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
              <Zap size={28} className="mx-auto text-[#A8A6A0]" />
              <p className="text-body-sm text-[#A8A6A0]">
                Şu an aktif (girilebilir) sinyal yok. Bu normal — filtreler sıkı, her taramada çıkmayabilir.
              </p>
            </div>
          )}
          {activeSignals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-h2 text-[#F5F1EA]">Aktif Sinyaller ({activeSignals.length})</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {activeSignals.map((s) => (
                  <SignalCard key={s.symbol} signal={s} market={market} />
                ))}
              </div>
            </div>
          )}
          {tracked && tracked.signals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-h2 text-[#F5F1EA]">
                Takip Edilenler ({tracked.signals.length})
              </h2>
              <StatsCard title="Toplam" accentColor="#F5F1EA" stats={tracked.stats} />
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

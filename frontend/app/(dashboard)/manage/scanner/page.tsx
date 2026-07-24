"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, TrendingUp, TrendingDown, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useLastScan,
  useTriggerScan,
  useLivePrice,
  useTrackedSignals,
  type ScanSignal,
  type TrackedSignal,
} from "@/lib/hooks/use-admin-scanner";

const STRENGTH_STYLES: Record<ScanSignal["strength"], { label: string; bg: string; color: string }> = {
  GUCLU: { label: "KALİTELİ (4/4)", bg: "#32D66B22", color: "#32D66B" },
  ORTA: { label: "ORTA (3/4)", bg: "#F39C3D22", color: "#F39C3D" },
  RISKLI: { label: "DÜŞÜK (2/4)", bg: "#FF5C5C22", color: "#FF5C5C" },
};

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
      style={{ backgroundColor: bullish ? "#32D66B22" : "#FF5C5C22" }}
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
        <TrendingUp size={18} color="#32D66B" />
      ) : (
        <TrendingDown size={18} color="#FF5C5C" />
      )}
    </div>
  );
}
function SignalCard({ signal }: { signal: ScanSignal }) {
  const strengthStyle = STRENGTH_STYLES[signal.strength];
  const bullish = signal.direction === "LONG";
  const { data: live } = useLivePrice(signal.symbol, true);
  const displayPrice = live?.price ?? signal.currentPrice;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={signal.symbol} bullish={bullish} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#F5F8FF]">{signal.symbol}</p>
              <a
                href={`https://www.binance.com/en/futures/${signal.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8D9BB6] hover:text-primary"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F0B90B">
                  <path d="M12 2 L15.5 5.5 L12 9 L8.5 5.5 Z" />
                  <path d="M5.5 8.5 L9 12 L5.5 15.5 L2 12 Z" />
                  <path d="M18.5 8.5 L22 12 L18.5 15.5 L15 12 Z" />
                  <path d="M12 15 L15.5 18.5 L12 22 L8.5 18.5 Z" />
                  <path d="M12 9 L14.5 11.5 L12 14 L9.5 11.5 Z" />
                </svg>
              </a>
            </div>
            <p className="text-xs text-[#8D9BB6]">{bullish ? "LONG" : "SHORT"}</p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: strengthStyle.bg, color: strengthStyle.color }}
        >
          {strengthStyle.label}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#355CFF33] bg-gradient-to-r from-[#355CFF14] to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#32D66B] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#32D66B]" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#32D66B]">Canlı</span>
        </div>
        <span className="font-mono text-base font-bold text-[#F5F8FF]">
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">Giriş Bölgesi</p>
          <p className="text-xs font-semibold text-[#F5F8FF]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">Stop</p>
          <p className="text-xs font-semibold text-[#FF5C5C]">{fmt(signal.stop)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">R:R</p>
          <p className="text-xs font-semibold text-[#F5F8FF]">1:{signal.rr}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#8D9BB6]">TP1</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp1)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#8D9BB6]">TP2</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5 text-center">
          <p className="text-[10px] text-[#8D9BB6]">TP3</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp3)}</p>
        </div>
      </div>

      <div className="space-y-1">
        {signal.reasons.map((r, i) => (
          <p key={i} className="text-xs text-[#8D9BB6]">
            • {r}
          </p>
        ))}
      </div>

      {signal.aiCommentary && (
        <div className="rounded-lg border border-[#355CFF40] bg-[#355CFF11] p-3">
          <p className="text-xs text-[#D7E1F8]">{signal.aiCommentary}</p>
        </div>
      )}

      {signal.fundingRate !== null && (
        <p className="text-[10px] text-[#8D9BB6]">
          Funding rate: {(signal.fundingRate as number).toFixed(4)}%
        </p>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<TrackedSignal["status"], { label: string; bg: string; color: string }> = {
  WATCHING: { label: "IZLENIYOR", bg: "#8D9BB622", color: "#8D9BB6" },
  TRIGGERED: { label: "TETIKLENDI", bg: "#355CFF22", color: "#355CFF" },
  HIT_TP1: { label: "TP1 VURULDU", bg: "#32D66B22", color: "#32D66B" },
  HIT_TP2: { label: "TP2 VURULDU", bg: "#32D66B22", color: "#32D66B" },
  HIT_TP3: { label: "TP3 VURULDU", bg: "#32D66B22", color: "#32D66B" },
  HIT_STOP: { label: "STOP OLDU", bg: "#FF5C5C22", color: "#FF5C5C" },
  EXPIRED: { label: "SURESI DOLDU", bg: "#F39C3D22", color: "#F39C3D" },
};

function TrackedSignalCard({ signal }: { signal: TrackedSignal }) {
  const strengthStyle = STRENGTH_STYLES[signal.strength];
  const style = STATUS_STYLES[signal.status];
  const showStatusBadge = signal.status === "WATCHING" || signal.status === "TRIGGERED" || signal.status === "EXPIRED";
  const bullish = signal.direction === "LONG";
  const isOpen = signal.closedAt === null;
  const { data: live } = useLivePrice(signal.symbol, isOpen);
  const displayPrice = live?.price ?? null;
  const hitLevel =
    signal.status === "HIT_TP1" ? 1 : signal.status === "HIT_TP2" ? 2 : signal.status === "HIT_TP3" ? 3 : 0;
  const stopHit = signal.status === "HIT_STOP";
  const tpBoxClass = (level: number) =>
    hitLevel >= level
      ? "rounded-lg border border-[#32D66B40] bg-[#32D66B1A] p-2.5 text-center"
      : "rounded-lg border border-border bg-card-inner p-2.5 text-center";
  const stopBoxClass = stopHit
    ? "rounded-lg border border-[#FF5C5C40] bg-[#FF5C5C1A] p-2.5"
    : "rounded-lg border border-border bg-card-inner p-2.5";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={signal.symbol} bullish={bullish} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#F5F8FF]">{signal.symbol}</p>
              <a
                href={`https://www.binance.com/en/futures/${signal.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8D9BB6] hover:text-primary"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F0B90B">
                  <path d="M12 2 L15.5 5.5 L12 9 L8.5 5.5 Z" />
                  <path d="M5.5 8.5 L9 12 L5.5 15.5 L2 12 Z" />
                  <path d="M18.5 8.5 L22 12 L18.5 15.5 L15 12 Z" />
                  <path d="M12 15 L15.5 18.5 L12 22 L8.5 18.5 Z" />
                  <path d="M12 9 L14.5 11.5 L12 14 L9.5 11.5 Z" />
                </svg>
              </a>
            </div>
            <p className="text-xs text-[#8D9BB6]">{bullish ? "LONG" : "SHORT"}</p>
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
        </div>
      </div>
      {isOpen && (
        <div className="flex items-center justify-between rounded-xl border border-[#355CFF33] bg-gradient-to-r from-[#355CFF14] to-transparent px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#32D66B] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#32D66B]" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#32D66B]">Canlı</span>
          </div>
          <span className="font-mono text-base font-bold text-[#F5F8FF]">
            {displayPrice != null ? fmt(displayPrice) : "…"}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">Giriş Bölgesi</p>
          <p className="text-xs font-semibold text-[#F5F8FF]">
            {fmt(signal.entryZoneBottom)} - {fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div className={stopBoxClass}>
          <p className="text-[10px] text-[#8D9BB6]">Stop</p>
          <p className="text-xs font-semibold text-[#FF5C5C]">{fmt(signal.stop)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">R:R</p>
          <p className="text-xs font-semibold text-[#F5F8FF]">1:{signal.rr}</p>
        </div>
        <div className="rounded-lg border border-border bg-card-inner p-2.5">
          <p className="text-[10px] text-[#8D9BB6]">Oluşturuldu</p>
          <p className="text-xs font-semibold text-[#F5F8FF]">
            {new Date(signal.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={tpBoxClass(1)}>
          <p className="text-[10px] text-[#8D9BB6]">TP1</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp1)}</p>
        </div>
        <div className={tpBoxClass(2)}>
          <p className="text-[10px] text-[#8D9BB6]">TP2</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp2)}</p>
        </div>
        <div className={tpBoxClass(3)}>
          <p className="text-[10px] text-[#8D9BB6]">TP3</p>
          <p className="text-xs font-semibold text-[#32D66B]">{fmt(signal.tp3)}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminScannerPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [style, setStyle] = useState<"SWING" | "DAY">("SWING");
  const { data: lastScan, isLoading } = useLastScan(style);
  const { data: tracked } = useTrackedSignals(style);
  const triggerScan = useTriggerScan(style);

  if (authLoading) {
    return <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
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
          <h1 className="text-2xl font-semibold text-[#F5F8FF]">AI Chart Scanner</h1>
          <p className="text-sm text-[#8D9BB6]">
            Sadece kişisel kullanım — öğrencilere kapalı. Binance top 200 kripto, 15 dakikada bir otomatik tarama.
          </p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1 max-w-xs">
        <button
          type="button"
          onClick={() => setStyle("SWING")}
          className={`rounded-lg py-2 text-xs font-medium transition-colors duration-200 sm:text-sm ${
            style === "SWING" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Swing Trade
        </button>
        <button
          type="button"
          onClick={() => setStyle("DAY")}
          className={`rounded-lg py-2 text-xs font-medium transition-colors duration-200 sm:text-sm ${
            style === "DAY" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Day Trade
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleScan} disabled={triggerScan.isPending} className="h-10">
          <Zap size={16} className="mr-2" />
          {triggerScan.isPending ? "Kuyruğa ekleniyor..." : "Şimdi Tara"}
        </Button>
        {results?.scannedAt && (
          <span className="text-xs text-[#8D9BB6]">
            Son tarama: {new Date(results.scannedAt).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
      ) : (
        <>
          {activeSignals.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
              <Zap size={28} className="mx-auto text-[#8D9BB6]" />
              <p className="text-sm text-[#8D9BB6]">
                Şu an aktif (girilebilir) sinyal yok. Bu normal — filtreler sıkı, her taramada çıkmayabilir.
              </p>
            </div>
          )}
          {activeSignals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#F5F8FF]">Aktif Sinyaller ({activeSignals.length})</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {activeSignals.map((s) => (
                  <SignalCard key={s.symbol} signal={s} />
                ))}
              </div>
            </div>
          )}
          {tracked && tracked.signals.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[#F5F8FF]">
                  Takip Edilenler ({tracked.signals.length})
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#8D9BB6] flex-wrap">
                  <span>Toplam: {tracked.stats.total}</span>
                  <span className="text-[#32D66B]">Kazandi: {tracked.stats.wins}</span>
                  <span className="text-[#FF5C5C]">Stop: {tracked.stats.losses}</span>
                  {tracked.stats.winRate !== null && (
                    <span className="font-semibold text-[#F5F8FF]">
                      Basari: %{tracked.stats.winRate}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tracked.signals.map((s) => (
                  <TrackedSignalCard key={s.id} signal={s} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";
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
  GUCLU: { label: "GÜÇLÜ (4/4)", bg: "#32D66B22", color: "#32D66B" },
  ORTA: { label: "ORTA (3/4)", bg: "#F39C3D22", color: "#F39C3D" },
  RISKLI: { label: "RİSKLİ (2/4)", bg: "#FF5C5C22", color: "#FF5C5C" },
};

function fmt(n: number) {
  if (Math.abs(n) >= 100) return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 6 });
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
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: bullish ? "#32D66B22" : "#FF5C5C22" }}
          >
            {bullish ? (
              <TrendingUp size={18} color="#32D66B" />
            ) : (
              <TrendingDown size={18} color="#FF5C5C" />
            )}
          </div>
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
  const style = STATUS_STYLES[signal.status];
  const bullish = signal.direction === "LONG";
  const isOpen = signal.closedAt === null;
  const { data: live } = useLivePrice(signal.symbol, isOpen);

  return (
    <div className="rounded-xl border border-border bg-card-inner p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {bullish ? (
            <TrendingUp size={14} color="#32D66B" />
          ) : (
            <TrendingDown size={14} color="#FF5C5C" />
          )}
          <span className="text-xs font-semibold text-[#F5F8FF]">{signal.symbol}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: style.bg, color: style.color }}
        >
          {style.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div>
          <p className="text-[9px] text-[#8D9BB6]">Giris</p>
          <p className="text-[11px] font-mono text-[#F5F8FF]">
            {fmt(signal.entryZoneBottom)}-{fmt(signal.entryZoneTop)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-[#8D9BB6]">Stop</p>
          <p className="text-[11px] font-mono text-[#FF5C5C]">{fmt(signal.stop)}</p>
        </div>
        <div>
          <p className="text-[9px] text-[#8D9BB6]">{isOpen ? "Canli" : "Kapandi"}</p>
          <p className="text-[11px] font-mono text-[#F5F8FF]">
            {isOpen ? (live?.price != null ? fmt(live.price) : "...") : "-"}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-[#8D9BB6]">
        {new Date(signal.createdAt).toLocaleString("tr-TR")}
      </p>
    </div>
  );
}

export default function AdminScannerPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: lastScan, isLoading } = useLastScan();
  const { data: tracked } = useTrackedSignals();
  const triggerScan = useTriggerScan();

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
  const staleSignals = allCrypto.filter((s) => !s.stillValid);

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-[#F5F8FF]">
                  Takip Edilenler ({tracked.signals.length})
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#8D9BB6]">
                  <span className="text-[#32D66B]">Kazandi: {tracked.stats.wins}</span>
                  <span className="text-[#FF5C5C]">Stop: {tracked.stats.losses}</span>
                  <span className="text-[#F39C3D]">Suresi doldu: {tracked.stats.expired}</span>
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
          {staleSignals.length > 0 && (
            <details className="rounded-2xl border border-border bg-card/50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-[#8D9BB6]">
                Kaçmış / İzlenen Setup'lar ({staleSignals.length}) — girmek için geç, referans amaçlı
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 opacity-60">
                {staleSignals.map((s) => (
                  <SignalCard key={s.symbol} signal={s} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

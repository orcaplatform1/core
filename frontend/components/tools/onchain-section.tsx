"use client";

import { Blocks, Gauge, Users, Activity, Zap } from "lucide-react";
import { useOnchain } from "@/lib/hooks/use-onchain";
import { ToolCard } from "./tool-card";
import { CircularProgress } from "./circular-progress";

function fmtCompact(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function OnchainSection() {
  const { data } = useOnchain();

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard title="Onchain Veriler" icon={Blocks} accent="primary">
          <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
        </ToolCard>
      </div>
    );
  }

  const congestionPct = data.mempool
    ? Math.min(100, Math.round((data.mempool.count / 50_000) * 100))
    : 0;
  const congestionColor =
    congestionPct >= 70 ? "var(--danger)" : congestionPct >= 35 ? "var(--warning)" : "var(--success)";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ToolCard title="Blok Yüksekliği" icon={Blocks} accent="primary">
        <p className="text-num-md text-foreground">
          {data.blockHeight != null ? data.blockHeight.toLocaleString("en-US") : "—"}
        </p>
        <p className="mt-1 text-body-xs text-muted-foreground">Bitcoin ana zinciri</p>
      </ToolCard>

      <ToolCard title="Mempool Tıkanıklığı" icon={Gauge} accent="warning">
        {data.mempool ? (
          <div className="flex items-center gap-5">
            <CircularProgress value={congestionPct} color={congestionColor} label="dolu" />
            <div>
              <p className="text-num-sm text-foreground">
                {data.mempool.count.toLocaleString("en-US")} işlem
              </p>
              <p className="text-body-xs text-muted-foreground">{data.mempool.vsizeMb.toFixed(1)} MB bekliyor</p>
            </div>
          </div>
        ) : (
          <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
        )}
      </ToolCard>

      <ToolCard title="Önerilen Fee Seviyeleri (sat/vB)" icon={Zap} accent="success">
        {data.fees ? (
          <div className="grid grid-cols-2 gap-2 text-body-xs">
            <div className="rounded-lg card-inner p-2.5">
              <p className="text-muted-foreground">En Hızlı</p>
              <p className="mt-0.5 text-num-sm text-foreground">{data.fees.fastestFee}</p>
            </div>
            <div className="rounded-lg card-inner p-2.5">
              <p className="text-muted-foreground">30 Dakika</p>
              <p className="mt-0.5 text-num-sm text-foreground">{data.fees.halfHourFee}</p>
            </div>
            <div className="rounded-lg card-inner p-2.5">
              <p className="text-muted-foreground">1 Saat</p>
              <p className="mt-0.5 text-num-sm text-foreground">{data.fees.hourFee}</p>
            </div>
            <div className="rounded-lg card-inner p-2.5">
              <p className="text-muted-foreground">Ekonomik</p>
              <p className="mt-0.5 text-num-sm text-foreground">{data.fees.economyFee}</p>
            </div>
          </div>
        ) : (
          <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
        )}
      </ToolCard>

      <ToolCard title="Hash Rate & Zorluk" icon={Activity} accent="purple">
        {data.hashrate ? (
          <>
            <p className="text-num-md text-foreground">{data.hashrate.currentEh.toFixed(1)} EH/s</p>
            <p className="mt-1 text-body-xs text-muted-foreground">
              Zorluk: {fmtCompact(data.hashrate.difficulty)}
            </p>
          </>
        ) : (
          <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
        )}
      </ToolCard>

      <ToolCard title="Aktif Adres (24s)" icon={Users} accent="primary">
        <p className="text-num-md text-foreground">{fmtCompact(data.activeAddresses24h)}</p>
        <p className="mt-1 text-body-xs text-muted-foreground">Kaynak: Blockchain.com</p>
      </ToolCard>

      <ToolCard title="İşlem Hacmi (24s)" icon={Activity} accent="warning">
        <p className="text-num-md text-foreground">{fmtCompact(data.txVolume24h)}</p>
        <p className="mt-1 text-body-xs text-muted-foreground">Kaynak: Blockchain.com</p>
      </ToolCard>
    </div>
  );
}

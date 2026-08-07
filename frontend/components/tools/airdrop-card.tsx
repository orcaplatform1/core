"use client";

import Link from "next/link";
import { Wallet, ShieldCheck, Clock, Gift } from "lucide-react";
import type { Airdrop } from "@/lib/hooks/use-airdrops";
import { AdCountdownBadge } from "./ad-countdown-badge";

const STATUS_STYLES: Record<Airdrop["status"], { label: string; bg: string; color: string }> = {
  UPCOMING: { label: "YAKINDA", bg: "#3B5BFF22", color: "#3B5BFF" },
  ACTIVE: { label: "AKTİF", bg: "#22C55E22", color: "#22C55E" },
  ENDED: { label: "SONA ERDİ", bg: "#A8A6A022", color: "#A8A6A0" },
};

const DIFFICULTY_STYLES: Record<Airdrop["difficulty"], { label: string; bg: string; color: string }> = {
  EASY: { label: "KOLAY", bg: "#22C55E22", color: "#22C55E" },
  MEDIUM: { label: "ORTA", bg: "#F39C3D22", color: "#F39C3D" },
  HARD: { label: "ZOR", bg: "#EF444422", color: "#EF4444" },
};

function fmtUsd(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (n >= 1e3) return `$${(n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// Ozet karti - AI Chart Scanner'daki sinyal kartlarinin (glow-primary rounded-2xl
// border) gorsel dilini kullanir. Tum detaylar burada DEGIL, tikla-detay
// sayfasinda (bkz. app/(dashboard)/tools/crypto/airdrops/[slug]/page.tsx).
export function AirdropCard({ airdrop }: { airdrop: Airdrop }) {
  const statusStyle = STATUS_STYLES[airdrop.status];
  const difficultyStyle = DIFFICULTY_STYLES[airdrop.difficulty];
  const value = fmtUsd(airdrop.estimatedValueUSD);

  return (
    <Link
      href={`/tools/crypto/airdrops/${airdrop.slug}`}
      className="glow-primary block rounded-2xl border border-border bg-card p-4 space-y-3 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {airdrop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={airdrop.logo} alt={airdrop.projectName} className="size-9 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Gift className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-card-title-sm text-foreground/90">{airdrop.title}</p>
            <p className="truncate text-body-xs text-muted-foreground">{airdrop.projectName} · {airdrop.blockchain}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
            {statusStyle.label}
          </span>
          <span className="rounded-full px-2 py-0.5 text-badge" style={{ backgroundColor: difficultyStyle.bg, color: difficultyStyle.color }}>
            {difficultyStyle.label}
          </span>
        </div>
      </div>

      {airdrop.isAd && <AdCountdownBadge expiresAt={airdrop.adExpiresAt} />}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">
          Ödül: <span className="text-financial text-success">{airdrop.estimatedReward ?? value ?? "—"}</span>
        </span>
        {airdrop.completionTime && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {airdrop.completionTime}
          </span>
        )}
        {airdrop.requiresWallet && (
          <span className="flex items-center gap-1">
            <Wallet className="size-3" /> Cüzdan
          </span>
        )}
        {airdrop.requiresKYC && (
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3" /> KYC
          </span>
        )}
      </div>

      <span className="inline-block text-body-xs font-medium text-primary">Detayları Gör →</span>
    </Link>
  );
}

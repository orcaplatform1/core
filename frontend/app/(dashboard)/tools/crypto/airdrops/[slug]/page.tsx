"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  ShieldCheck,
  Clock,
  Calendar,
  Camera,
  Coins,
  Globe,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useAirdrop } from "@/lib/hooks/use-airdrops";
import { ExternalLink } from "@/components/ui/external-link";
import { AdCountdownBadge } from "@/components/tools/ad-countdown-badge";

function fmtDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtUsd(n: number | null): string | null {
  if (n == null) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card-inner p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-body-xs text-muted-foreground">{label}</p>
        <p className="text-body-sm text-foreground/90">{value}</p>
      </div>
    </div>
  );
}

export default function AirdropDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: airdrop, isLoading } = useAirdrop(slug);

  if (isLoading) {
    return <p className="text-body-sm text-muted-foreground">Yükleniyor...</p>;
  }

  if (!airdrop) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} className="mx-auto text-danger" />
        <p className="text-body-sm text-muted-foreground">Bu airdrop bulunamadı.</p>
        <Link href="/tools/crypto/airdrops" className="text-body-sm text-primary hover:underline">
          ← Airdrop listesine dön
        </Link>
      </div>
    );
  }

  const requirements = [
    airdrop.requiresWallet && "Cüzdan bağlama",
    airdrop.requiresKYC && "KYC doğrulama",
    airdrop.requiresDiscord && "Discord üyeliği",
    airdrop.requiresTwitter && "Twitter (X) takip",
    airdrop.requiresTelegram && "Telegram üyeliği",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <Link href="/tools/crypto/airdrops" className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Airdrop listesine dön
      </Link>

      <div className="glow-primary rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {airdrop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={airdrop.logo} alt={airdrop.projectName} className="size-12 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Gift className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-h3 text-foreground">{airdrop.title}</h1>
              <p className="text-body-sm text-muted-foreground">{airdrop.projectName} · {airdrop.blockchain} · {airdrop.category}</p>
            </div>
          </div>
          {airdrop.isAd && <AdCountdownBadge expiresAt={airdrop.adExpiresAt} />}
        </div>

        {airdrop.description && <p className="text-body-sm text-foreground/80">{airdrop.description}</p>}

        <div className="flex flex-wrap gap-2 text-body-xs">
          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-primary">{airdrop.status}</span>
          <span className="rounded-full bg-warning/12 px-2.5 py-1 text-warning">{airdrop.difficulty}</span>
          <span className="rounded-full bg-success/12 px-2.5 py-1 text-success">AI Skor: {airdrop.aiScore}/100</span>
          <span className="rounded-full bg-danger/12 px-2.5 py-1 text-danger">Risk Skoru: {airdrop.riskScore}/100</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <DetailRow icon={Coins} label="Ödül Tipi" value={airdrop.rewardType} />
          <DetailRow icon={Gift} label="Tahmini Ödül" value={airdrop.estimatedReward ?? fmtUsd(airdrop.estimatedValueUSD)} />
          <DetailRow icon={Clock} label="Tahmini Süre" value={airdrop.completionTime} />
          <DetailRow icon={Calendar} label="Başlangıç" value={fmtDate(airdrop.startDate)} />
          <DetailRow icon={Calendar} label="Bitiş" value={fmtDate(airdrop.endDate)} />
          <DetailRow icon={Camera} label="Snapshot Tarihi" value={fmtDate(airdrop.snapshotDate)} />
          <DetailRow icon={Sparkles} label="Claim Tarihi" value={fmtDate(airdrop.claimDate)} />
        </div>

        {requirements.length > 0 && (
          <div className="rounded-xl border border-border bg-card-inner p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-body-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Gereksinimler
            </p>
            <div className="flex flex-wrap gap-1.5">
              {requirements.map((r) => (
                <span key={r} className="rounded-full bg-secondary px-2.5 py-1 text-body-xs text-foreground/80">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {airdrop.website && (
            <ExternalLink href={airdrop.website} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              <Globe className="size-4" /> Web Sitesi
            </ExternalLink>
          )}
          {airdrop.documentation && (
            <ExternalLink href={airdrop.documentation} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Dokümantasyon
            </ExternalLink>
          )}
          {airdrop.twitter && (
            <ExternalLink href={airdrop.twitter} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Twitter
            </ExternalLink>
          )}
          {airdrop.discord && (
            <ExternalLink href={airdrop.discord} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Discord
            </ExternalLink>
          )}
          {airdrop.telegram && (
            <ExternalLink href={airdrop.telegram} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Telegram
            </ExternalLink>
          )}
        </div>
      </div>
    </div>
  );
}

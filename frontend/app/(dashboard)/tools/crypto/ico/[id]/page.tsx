"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Rocket, Star, Calendar, Coins, Globe, Rocket as LaunchIcon, ShieldCheck, ShieldAlert } from "lucide-react";
import { useIcoProject } from "@/lib/hooks/use-ico-tracker";
import { ExternalLink } from "@/components/ui/external-link";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
import { AdCountdownBadge } from "@/components/tools/ad-countdown-badge";

function fmtDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtUsd(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (n >= 1e3) return `$${(n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
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

export default function IcoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useIcoProject(id);

  if (!project) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} className="mx-auto text-danger" />
        <p className="text-body-sm text-muted-foreground">Bu ICO/IDO projesi bulunamadı.</p>
        <Link href="/tools/crypto/ico" className="text-body-sm text-primary hover:underline">
          ← ICO listesine dön
        </Link>
      </div>
    );
  }

  const requirements = [project.requiresKYC && "KYC doğrulama", project.requiresWhitelist && "Whitelist"].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <Link href="/tools/crypto/ico" className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> ICO listesine dön
      </Link>

      <div className="glow-primary rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {project.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.logo} alt={project.name} className="size-12 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Rocket className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-h3 text-foreground">{project.name}</h1>
              <p className="text-body-sm text-muted-foreground">
                {project.tokenSymbol ?? "—"} {project.blockchain ? `· ${project.blockchain}` : ""} {project.category ? `· ${project.category}` : ""}
              </p>
            </div>
          </div>
          {project.isAd && <AdCountdownBadge expiresAt={project.adExpiresAt} />}
        </div>

        {project.description && <p className="text-body-sm text-foreground/80">{project.description}</p>}

        <div className="flex flex-wrap gap-2 text-body-xs">
          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-primary">{project.status}</span>
          {project.saleType && <span className="rounded-full bg-warning/12 px-2.5 py-1 text-warning">{project.saleType}</span>}
          {project.ratingScore != null && (
            <span className="flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-success">
              <Star className="size-3" /> {project.ratingScore.toFixed(1)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <DetailRow icon={Coins} label="Toplanan Miktar" value={fmtUsd(project.raisedAmountUsd)} />
          <DetailRow icon={Coins} label="Hard Cap" value={fmtUsd(project.hardCapUsd)} />
          <DetailRow icon={Coins} label="Değerleme (FDV)" value={fmtUsd(project.valuationUsd)} />
          <DetailRow icon={Coins} label="Token Fiyatı" value={project.tokenPrice != null ? `$${project.tokenPrice}` : null} />
          <DetailRow icon={Calendar} label="Başlangıç" value={fmtDate(project.startDate)} />
          <DetailRow icon={Calendar} label="Bitiş" value={fmtDate(project.endDate)} />
        </div>

        {project.allocationDetails && (
          <div className="rounded-xl border border-border bg-card-inner p-3.5">
            <p className="mb-1.5 text-body-xs font-medium text-muted-foreground">Tahsisat Detayları</p>
            <p className="text-body-sm text-foreground/80 whitespace-pre-line">{project.allocationDetails}</p>
          </div>
        )}

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

        <div className="flex flex-wrap items-center gap-2">
          {project.launchpadUrl && (
            <PremiumGlowButton
              render={
                <a href={project.launchpadUrl} target="_blank" rel="noopener noreferrer">
                  <LaunchIcon className="size-4" /> {project.launchpad ? `${project.launchpad}'dan Katıl` : "Lansmana Katıl"}
                </a>
              }
            />
          )}
          {project.websiteUrl && (
            <ExternalLink href={project.websiteUrl} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              <Globe className="size-4" /> Web Sitesi
            </ExternalLink>
          )}
          {project.twitter && (
            <ExternalLink href={project.twitter} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Twitter
            </ExternalLink>
          )}
          {project.telegram && (
            <ExternalLink href={project.telegram} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Telegram
            </ExternalLink>
          )}
          {project.discord && (
            <ExternalLink href={project.discord} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 hover:border-primary hover:text-primary">
              Discord
            </ExternalLink>
          )}
        </div>
      </div>
    </div>
  );
}

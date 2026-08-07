"use client";

import Link from "next/link";
import { Rocket, Star, Calendar } from "lucide-react";
import type { IcoProject, IcoStatus } from "@/lib/hooks/use-ico-tracker";
import { AdCountdownBadge } from "./ad-countdown-badge";

const STATUS_LABEL: Record<IcoStatus, string> = {
  UPCOMING: "Yaklaşan",
  ACTIVE: "Aktif",
  ENDED: "Sona Erdi",
};

function StatusBadge({ status }: { status: IcoStatus }) {
  const cls =
    status === "UPCOMING"
      ? "bg-primary/12 text-primary"
      : status === "ACTIVE"
        ? "bg-success/12 text-success"
        : "bg-muted/30 text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-badge ${cls}`}>{STATUS_LABEL[status]}</span>;
}

function fmtRaised(amount: number | null): string | null {
  if (amount == null) return null;
  if (amount >= 1e9) return `$${(amount / 1e9).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

// Ozet karti - AI Chart Scanner'daki sinyal kartlarinin gorsel dilini kullanir,
// tum detaylar tikla-detay sayfasinda (bkz. tools/crypto/ico/[id]/page.tsx).
export function IcoCard({ project }: { project: IcoProject }) {
  const raised = fmtRaised(project.raisedAmountUsd);
  const startDate = fmtDate(project.startDate);
  const endDate = fmtDate(project.endDate);

  return (
    <Link
      href={`/tools/crypto/ico/${project.id}`}
      className="glow-primary block rounded-2xl border border-border bg-card p-4 space-y-3 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {project.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logo} alt={project.name} className="size-9 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Rocket className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-card-title-sm text-foreground/90">{project.name}</p>
            {project.tokenSymbol && <p className="truncate text-body-xs text-muted-foreground">{project.tokenSymbol}</p>}
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.isAd && <AdCountdownBadge expiresAt={project.adExpiresAt} />}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-xs text-muted-foreground">
        {raised && (
          <span className="font-medium text-foreground/80">
            Toplanan: <span className="text-financial text-success">{raised}</span>
          </span>
        )}
        {project.ratingScore != null && (
          <span className="flex items-center gap-1">
            <Star className="size-3 text-warning" />
            {project.ratingScore.toFixed(1)}
          </span>
        )}
      </div>

      {(startDate || endDate) && (
        <div className="flex items-center gap-1 text-body-xs text-muted-foreground">
          <Calendar className="size-3" />
          <span>
            {startDate ?? "?"} {endDate ? `– ${endDate}` : ""}
          </span>
        </div>
      )}

      <span className="inline-block text-body-xs font-medium text-primary">Detayları Gör →</span>
    </Link>
  );
}

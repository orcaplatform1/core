"use client";

import { Rocket, ExternalLink, Star, Calendar } from "lucide-react";
import { useIcoProjects, type IcoProject, type IcoStatus } from "@/lib/hooks/use-ico-tracker";
import { ExternalLink as ExternalLinkConfirm } from "@/components/ui/external-link";
import { ToolCard } from "./tool-card";

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
  return (
    <span className={`rounded-full px-2 py-0.5 text-badge ${cls}`}>{STATUS_LABEL[status]}</span>
  );
}

function IcoCard({ project }: { project: IcoProject }) {
  const raised = fmtRaised(project.raisedAmountUsd);
  const startDate = fmtDate(project.startDate);
  const endDate = fmtDate(project.endDate);

  return (
    <div className="rounded-lg card-inner p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-card-title-sm text-foreground/90">{project.name}</p>
          {project.tokenSymbol && (
            <p className="text-body-xs text-muted-foreground">{project.tokenSymbol}</p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

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
        <div className="mt-1.5 flex items-center gap-1 text-body-xs text-muted-foreground">
          <Calendar className="size-3" />
          <span>
            {startDate ?? "?"} {endDate ? `– ${endDate}` : ""}
          </span>
        </div>
      )}

      {project.websiteUrl && (
        <ExternalLinkConfirm
          href={project.websiteUrl}
          className="mt-2 inline-flex items-center gap-1 text-body-xs font-medium text-primary hover:underline"
        >
          Web sitesi <ExternalLink className="size-3" />
        </ExternalLinkConfirm>
      )}
    </div>
  );
}

function IcoEmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
        <Rocket className="size-5" />
      </span>
      <h3 className="text-card-title-sm text-foreground">Henüz ICO verisi yok</h3>
      <p className="mx-auto mt-1 max-w-sm text-body-xs text-muted-foreground">
        ICObench API anahtarları bağlandığında yaklaşan ve aktif ICO&apos;lar burada listelenecek.
      </p>
    </div>
  );
}

export function IcoTrackerSection() {
  const { data } = useIcoProjects();
  const projects = data ?? [];

  if (projects.length === 0) {
    return <IcoEmptyState />;
  }

  return (
    <ToolCard title="Yaklaşan ICO'lar" icon={Rocket} accent="primary" className="sm:col-span-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <IcoCard key={p.id} project={p} />
        ))}
      </div>
    </ToolCard>
  );
}

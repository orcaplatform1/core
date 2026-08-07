"use client";

import { Rocket } from "lucide-react";
import { useIcoProjects } from "@/lib/hooks/use-ico-tracker";
import { ToolCard } from "./tool-card";
import { IcoCard } from "./ico-card";

function IcoEmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
        <Rocket className="size-5" />
      </span>
      <h3 className="text-card-title-sm text-foreground">Henüz ICO/IDO verisi yok</h3>
      <p className="mx-auto mt-1 max-w-sm text-body-xs text-muted-foreground">
        Yaklaşan ve aktif ICO/IDO&apos;lar admin panelinden eklendiğinde burada listelenecek.
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
    <ToolCard title="ICO / IDO'lar" icon={Rocket} accent="primary" className="sm:col-span-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <IcoCard key={p.id} project={p} />
        ))}
      </div>
    </ToolCard>
  );
}

"use client";

import { ArrowDownCircle, ArrowUpCircle, Waves, ExternalLink } from "lucide-react";
import {
  useWhaleActivity,
  type WhaleAddressActivity,
  type WhaleMovementActivity,
  type WhaleCategory,
} from "@/lib/hooks/use-whale-tracker";
import { ExternalLink as ExternalLinkConfirm } from "@/components/ui/external-link";
import { ToolCard } from "./tool-card";

const CATEGORY_LABEL: Record<WhaleCategory, string> = {
  EXCHANGE: "Borsa",
  INSTITUTION: "Kurum",
  WHALE: "Balina",
};

const CATEGORY_BADGE_CLASS: Record<WhaleCategory, string> = {
  EXCHANGE: "bg-primary/12 text-primary",
  INSTITUTION: "bg-purple/12 text-purple",
  WHALE: "bg-warning/12 text-warning",
};

function satToBtc(sat: number): number {
  return sat / 1e8;
}

function fmtBtc(sat: number): string {
  return satToBtc(sat).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s önce`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

function SummaryStrip({ addresses }: { addresses: WhaleAddressActivity[] }) {
  const totalSat = addresses.reduce((sum, a) => sum + (a.latestBalanceSat ?? 0), 0);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg card-inner p-3 text-sm">
      <span className="text-muted-foreground">
        İzlenen Adresler: <span className="font-semibold text-foreground">{addresses.length}</span>
      </span>
      <span className="text-muted-foreground">
        Toplam Bakiye:{" "}
        <span className="font-semibold text-foreground">
          {satToBtc(totalSat).toLocaleString("en-US", { maximumFractionDigits: 2 })} BTC
        </span>
      </span>
    </div>
  );
}

function MovementCard({ movement }: { movement: WhaleMovementActivity }) {
  const isIn = movement.direction === "IN";
  const Icon = isIn ? ArrowDownCircle : ArrowUpCircle;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg card-inner p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`size-6 shrink-0 ${isIn ? "text-success" : "text-danger"}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground/90">{movement.addressLabel}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(movement.detectedAt)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`text-sm font-semibold ${isIn ? "text-success" : "text-danger"}`}>
          {isIn ? "+" : "-"}
          {fmtBtc(movement.amountSat)} BTC
        </span>
        <ExternalLinkConfirm
          href={`https://mempool.space/tx/${movement.txid}`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          İşlem <ExternalLink className="size-3" />
        </ExternalLinkConfirm>
      </div>
    </div>
  );
}

function WhaleEmptyState() {
  return (
    <div className="rounded-lg card-inner p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Henüz eşik değerini aşan bir hareket tespit edilmedi. İzleme her 7 dakikada bir güncellenir.
      </p>
    </div>
  );
}

export function WhaleTrackerSection() {
  const { data } = useWhaleActivity();
  const addresses = data?.addresses ?? [];
  const movements = data?.movements ?? [];

  return (
    <ToolCard title="Balina Cüzdan Takibi" icon={Waves} accent="purple" className="sm:col-span-2">
      <div className="space-y-3">
        <SummaryStrip addresses={addresses} />

        <div className="flex flex-wrap gap-1.5">
          {addresses.map((a) => (
            <span
              key={a.id}
              title={a.address}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_BADGE_CLASS[a.category]}`}
            >
              {a.label} · {CATEGORY_LABEL[a.category]}
              {a.latestBalanceSat != null && (
                <span className="ml-1 text-muted-foreground">({fmtBtc(a.latestBalanceSat)} BTC)</span>
              )}
            </span>
          ))}
        </div>

        {movements.length === 0 ? (
          <WhaleEmptyState />
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <MovementCard key={m.id} movement={m} />
            ))}
          </div>
        )}
      </div>
    </ToolCard>
  );
}

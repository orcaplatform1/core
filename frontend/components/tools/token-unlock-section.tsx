"use client";

import { Lock } from "lucide-react";
import { EmptyState } from "@/components/tools/empty-state";
import { useTokenUnlocks } from "@/lib/hooks/use-token-unlock";

export function TokenUnlockSection() {
  const { data } = useTokenUnlocks();

  if (data && data.length > 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <ul className="divide-y divide-border">
          {data.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between py-3 text-body-sm"
            >
              <span className="text-financial text-foreground">
                {event.tokenSymbol}
              </span>
              <span className="text-muted-foreground">
                {new Date(event.unlockDate).toLocaleDateString("tr-TR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <EmptyState
      icon={Lock}
      title="Kilidi Açılacak Coinler — Yakında"
      description="Token unlock takvimi entegrasyonu plan onayı bekliyor. Hazır olduğunda yaklaşan kilit açılışları burada listelenecek."
    />
  );
}

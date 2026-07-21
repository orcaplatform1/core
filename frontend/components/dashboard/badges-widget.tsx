"use client";

import Link from "next/link";
import { Medal, Award, Star, Flame, Target, Trophy } from "lucide-react";
import { useMyBadges } from "@/lib/hooks/use-dashboard";

const badgeIcons = [Star, Trophy, Flame, Target, Award, Medal];

export function BadgesWidget() {
  const { data, isLoading } = useMyBadges();

  if (isLoading) {
    return <div className="h-48 w-full animate-pulse rounded-2xl bg-card" />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Medal className="size-4 text-primary" /> Rozetlerim
        </h3>
        <Link href="/badges" className="text-xs text-primary hover:underline">
          Tüm Rozetler
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {data.slice(0, 5).map((badge, i) => {
          const Icon = badgeIcons[i % badgeIcons.length];
          return (
            <div key={badge.id} className="flex flex-col items-center gap-2 text-center">
              <div
                className={`flex size-14 items-center justify-center rounded-full border-2 transition-transform duration-200 hover:-translate-y-0.5 ${
                  badge.locked
                    ? "border-purple/25 bg-purple/5 text-purple/40"
                    : "border-purple/50 bg-purple/15 text-purple shadow-[0_0_18px_-4px_#8B5CF6]"
                }`}
              >
                <Icon className="size-6" />
              </div>
              <span className="line-clamp-2 text-[11px] font-medium text-foreground">
                {badge.name}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  badge.locked ? "text-muted-foreground" : "text-success"
                }`}
              >
                {badge.locked ? "Kilitli" : "Tamamlandı"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

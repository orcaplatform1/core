"use client";

import { Lock } from "lucide-react";

export function LockedOverlay({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60">{children}</div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-background/70 shadow-lg ring-1 ring-primary/30">
          <Lock className="size-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

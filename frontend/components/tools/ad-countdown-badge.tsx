"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}g ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// #Ads etiketli kayitlarin karti icin geri sayim rozeti - adExpiresAt gecince
// sunucu tarafinda (bkz. AirdropService/IcoTrackerService.expireAds, dakikada
// bir calisir) kaydin isAd alani otomatik false'a doner ve kart normal siraya
// geri doner; bu bilesen sadece kalan sureyi gostermek icin, sunmasi gereken
// gercek kaynak sunucu.
export function AdCountdownBadge({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-badge text-warning">
        <Megaphone className="size-3" /> #Ads
      </span>
    );
  }

  const remaining = new Date(expiresAt).getTime() - now;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-badge text-warning">
      <Megaphone className="size-3" /> #Ads · {formatRemaining(remaining)}
    </span>
  );
}

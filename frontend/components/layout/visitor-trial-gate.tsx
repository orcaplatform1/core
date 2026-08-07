"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVisitorTrialStatus } from "@/lib/hooks/use-visitor-trial";

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Araclar ve Topluluk bolumlerini giris yapmamis ziyaretcilere 2 dakikalik,
// MUTLAK (sayfa yenilense de sifirlanmayan) tek seferlik bir deneme
// suresiyle acar. Kaynak sunucu tarafindaki AnonymousVisitor kaydi (bkz.
// backend visitor-trial modulu) - ilk erisimde httpOnly+1 yillik bir cerezle
// esleşen bir DB satiri olusur, 2 dakika dolunca o satir kalici olarak
// "suresi doldu" sayilir, ayni cerezle bir daha deneme hakki verilmez. Giris
// yapmis HER kullanici (abonelik/satin alma durumu fark etmeksizin) bu
// gate'e hic takilmadan direkt icerigi gorur.
export function VisitorTrialGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isAnonymous = !authLoading && !user;

  const { data, isLoading: trialLoading } = useVisitorTrialStatus(isAnonymous);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (data) setSecondsLeft(data.remainingSeconds);
  }, [data]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  useEffect(() => {
    if (isAnonymous && (data?.expired || secondsLeft === 0)) {
      router.replace("/login?reason=trial_expired");
    }
  }, [isAnonymous, data, secondsLeft, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAnonymous) {
    return <>{children}</>;
  }

  if (trialLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.expired || secondsLeft === 0) {
    return null;
  }

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-warning/30 bg-card/95 px-3.5 py-2 shadow-lg backdrop-blur">
        <Clock className="size-3.5 text-warning" />
        <span className="text-body-xs text-muted-foreground">
          Ziyaretçi modu — <span className="font-medium text-warning">{formatTime(secondsLeft ?? data.remainingSeconds)}</span> sonra giriş gerekecek
        </span>
      </div>
    </>
  );
}

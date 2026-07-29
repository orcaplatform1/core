"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "orca-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function respond(choice: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Cookie className="size-4.5" />
          </span>
          <p className="text-sm text-muted-foreground">
            ORCA&apos;da deneyimini iyileştirmek için çerezler kullanıyoruz. Detaylar için{" "}
            <Link href="/cookie-policy" className="text-primary hover:underline">
              Çerez Politikası&apos;nı
            </Link>{" "}
            inceleyebilirsin.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" className="h-9" onClick={() => respond("rejected")}>
            Reddet
          </Button>
          <Button size="sm" className="h-9" onClick={() => respond("accepted")}>
            Kabul Et
          </Button>
        </div>
      </div>
    </div>
  );
}

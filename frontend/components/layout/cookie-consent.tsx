"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "orca-cookie-consent";

type CookiePrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function save(prefs: CookiePrefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
        {!showPreferences ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Cookie className="size-4.5" />
              </span>
              <p className="text-sm text-muted-foreground">
                ORCA Akademi olarak deneyimini iyileştirmek için yasalara uygun çerezler kullanıyoruz. Platformumuzda
                kesinlikle piyasa analizi, yatırım danışmanlığı veya al-sat tavsiyesi verilmez; yalnızca finansal
                okuryazarlık eğitimi sunulur. Detaylar için{" "}
                <Link href="/cookie-policy" className="text-primary hover:underline">
                  Çerez Politikası&apos;nı
                </Link>{" "}
                inceleyebilirsin.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowPreferences(true)}>
                Tercihleri Yönet
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => save({ necessary: true, analytics: false, marketing: false })}
              >
                Reddet
              </Button>
              <Button
                size="sm"
                className="h-9"
                onClick={() => save({ necessary: true, analytics: true, marketing: true })}
              >
                Kabul Et
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Cookie className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Çerez Tercihleri</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hangi çerez kategorilerine izin vereceğini aşağıdan seçebilirsin.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">🌐 Zorunlu Çerezler (Her Zaman Aktif)</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Satın aldığın online eğitim videolarına güvenli giriş yapabilmen ve offline eğitim kayıt
                    formlarının çalışması için zorunludur. Kapatılamaz.
                  </p>
                </div>
                <Switch checked disabled aria-label="Zorunlu çerezler (her zaman aktif)" />
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">📊 Performans ve Analiz Çerezleri</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sitemizdeki online eğitim modüllerinin izlenme sürelerini analiz ederek müfredatımızı
                    geliştirmemize yardımcı olur.
                  </p>
                </div>
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label="Performans ve analiz çerezlerini aç/kapat"
                />
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">📢 Pazarlama ve Reklam Çerezleri</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    İlgi duyduğun eğitim düzeyine (Başlangıç/İleri) uygun yeni eğitim kampanyalarından ve erken kayıt
                    indirimlerinden haberdar olmanı sağlar.
                  </p>
                </div>
                <Switch
                  checked={marketing}
                  onCheckedChange={setMarketing}
                  aria-label="Pazarlama ve reklam çerezlerini aç/kapat"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowPreferences(false)}>
                Geri
              </Button>
              <Button
                size="sm"
                className="h-9"
                onClick={() => save({ necessary: true, analytics, marketing })}
              >
                Tercihleri Kaydet
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

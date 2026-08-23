"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};
// Sunucuda her zaman "henüz bilinmiyor" döner, istemcide mount olduktan sonra
// gerçek tema okunur — next-themes hydration uyuşmazlığını (sunucu "dark"
// varsayar, istemcide localStorage farklı olabilir) böyle önlüyoruz; useEffect
// içinde setState yerine useSyncExternalStore kullanmak ekstra render turu
// yaratmıyor.
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Göz kapalı = koyu tema (varsayılan). Tıklayınca göz açılır, açık (gündüz)
// temaya geçilir.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  const isLight = isClient && resolvedTheme === "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isLight ? "Koyu temaya geç" : "Açık (gündüz) temaya geç"}
      title={isLight ? "Koyu temaya geç" : "Açık (gündüz) temaya geç"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={className}
    >
      {isLight ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
    </Button>
  );
}

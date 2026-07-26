import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonLockReason } from "@/lib/types/curriculum";

export function LockedLessonBanner({ reason }: { reason: LessonLockReason }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-warning/12 text-warning">
        <Lock className="size-5" />
      </span>
      {reason === "LEVEL_LOCKED" ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            1. Bir önceki seviyedeki programları başarıyla tamamlamadınız.
          </p>
          <p className="text-sm font-medium text-foreground">2. Bu programa erişim sağlayamazsınız.</p>
        </div>
      ) : (
        <>
          <p className="max-w-sm text-sm font-medium text-foreground">
            Henüz eğitim paketi satın almadığınız için içeriklere erişiminiz yoktur.
          </p>
          <Button size="sm" className="mt-1" render={<Link href="/subscription">Satın Al</Link>} />
        </>
      )}
    </div>
  );
}

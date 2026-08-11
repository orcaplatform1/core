import Link from "next/link";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

// ICO ve Airdrop sayfalarindaki "reklam ver" CTA'si - /tools/crypto/sponsor
// bilgilendirme+basvuru sayfasina goturur. Yesil "yanip sonen" (sponsor-cta-glow,
// bkz. globals.css) kasitli olarak premium-glow-button'dan (mavi/mor donen
// halka) ayri tutuluyor, o component'in yorumunda "sadece 4 ozel CTA icin"
// diye sinirlandirilmis.
export function SponsorCtaButton({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      href="/tools/crypto/sponsor"
      className={cn(
        "sponsor-cta-glow inline-flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-body-sm font-semibold text-white transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      <Megaphone className="size-4" />
      {label}
    </Link>
  );
}

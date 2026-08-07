"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

// Araclar (/tools) bolumu giris yapmamis ziyaretcilere de acik - 2 dakikalik
// deneme suresi orada VisitorTrialGate tarafindan yonetiliyor (bkz.
// app/(dashboard)/tools/layout.tsx). Bu listedeki path'ler icin bu guard
// login zorunlulugunu atlar, sidebar/topbar zaten null user ile calisiyor.
const PUBLICLY_ACCESSIBLE_PREFIXES = ["/tools"];

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPubliclyAccessible = PUBLICLY_ACCESSIBLE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    if (!isLoading && !user && !isPubliclyAccessible) {
      router.replace("/login");
    }
  }, [isLoading, user, isPubliclyAccessible, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && !isPubliclyAccessible) return null;

  return <>{children}</>;
}

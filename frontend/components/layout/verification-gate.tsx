"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export function VerificationGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Profil sayfası her zaman erişilebilir olmalı — yoksa kullanıcı
  // doğrulama yapacağı yere hiç gidemez (kısır döngü).
  if (pathname === "/profile") {
    return <>{children}</>;
  }

  const needsEmail = !!user?.email && !user?.emailVerified;
  const needsPhone = !!user?.phone && !user?.phoneVerified;

  if (needsEmail || needsPhone) {
    const target = needsPhone ? "Telefon numaranızı" : "E-posta adresinizi";
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-10 text-center">
        <ShieldAlert className="size-10 text-warning" />
        <h1 className="text-lg font-semibold text-foreground">Erişim Kısıtlaması</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {target} doğrulayana kadar güvenlik nedeniyle erişim kısıtlaması devam edecektir.
        </p>
        <Button className="h-11" render={<Link href="/profile">Profile Git ve Doğrula</Link>} />
      </div>
    );
  }

  return <>{children}</>;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16'da "middleware" "proxy" olarak yeniden adlandırıldı (bkz.
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md) - dosya
// middleware.ts olsaydı hiç çalışmazdı.
//
// Bu sadece iyimser (optimistic) bir kontrol: cookie'nin VARLIĞINA bakar,
// imzasını doğrulamaz (bkz. Next.js authentication guide, "Optimistic checks
// with Proxy"). Gerçek yetkilendirme sınırı her zaman backend'deki JwtAuthGuard
// - buradaki tek amaç, girişi olmayan bir kullanıcının dashboard kabuğunu hiç
// indirmeden /login'e yönlendirilmesi (DashboardGuard zaten aynı işi
// client-side yapıyordu, bu sadece daha erken ve flash'sız hale getiriyor).
export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get("orca_access_token") || request.cookies.get("orca_refresh_token")
  );

  if (!hasSession) {
    // next.config.ts basePath="/core" tanımlı - `new URL("/login", request.url)`
    // basePath'i yutup https://traders.tr/login (sitede olmayan bir path)
    // üretiyordu. `nextUrl.clone()` basePath'i koruyor.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Next.js'in build-time config analizörü statik olmayan ifadeleri (ör. .map()
// ile üretilen dizi) kabul etmiyor, bu yüzden liste burada elle yazılı duruyor
// - yeni bir korumalı bölüm eklenirse buraya da eklenmesi gerekir.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/backtest/:path*",
    "/badges/:path*",
    "/certificates/:path*",
    "/courses/:path*",
    "/leaderboard/:path*",
    "/live-lessons/:path*",
    "/manage/:path*",
    "/mentor/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/simulation/:path*",
    "/simulation-dna/:path*",
    "/subscription/:path*",
    "/support/:path*",
  ],
};

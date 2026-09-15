import type { MetadataRoute } from "next";

// Site /orca alt yolunda yayında (bkz. next.config.ts basePath) - üretilen
// dosya otomatik olarak /orca/robots.txt'de servis edilir.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/manage",
          "/courses",
          "/mentor",
          "/messages",
          "/notifications",
          "/profile",
          "/simulation",
          "/simulation-dna",
          "/subscription",
          "/support",
          "/tools",
          "/backtest",
          "/badges",
          "/certificates",
          "/leaderboard",
          "/live-lessons",
          "/login",
          "/register",
          "/reset-password",
          "/verify",
        ],
      },
    ],
    sitemap: "https://traders.tr/orca/sitemap.xml",
  };
}

import type { MetadataRoute } from "next";
import { getPrograms } from "@/lib/marketing/get-programs";
import { getFooterPages } from "@/lib/marketing/get-site-content";
import { LEGENDS } from "@/lib/data/legends";

const BASE = "https://traders.tr/core";

const STATIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "daily" as const },
  { path: "/programs", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/legends", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/glossary", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/community", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/success-stories", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/aboutorca", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/enhancers", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms-of-service", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/cookie-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/distance-sales-agreement", priority: 0.3, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, footerPages] = await Promise.all([getPrograms(), getFooterPages()]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const programEntries: MetadataRoute.Sitemap = programs.map((p) => ({
    url: `${BASE}/programs/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const legendEntries: MetadataRoute.Sitemap = LEGENDS.map((l) => ({
    url: `${BASE}/legends/${l.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const knownUrls = new Set(staticEntries.map((e) => e.url));
  const cmsEntries: MetadataRoute.Sitemap = footerPages
    .map((p) => `${BASE}/${p.slug}`)
    .filter((url) => !knownUrls.has(url))
    .map((url) => ({ url, changeFrequency: "monthly" as const, priority: 0.4 }));

  return [...staticEntries, ...programEntries, ...legendEntries, ...cmsEntries];
}

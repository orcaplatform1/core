import { DEFAULT_FOOTER_SETTINGS, DEFAULT_SITE_CONTENT } from "./default-site-content";
import type { FooterSettingsData, LegalPage, LegalPageSummary, SiteContentSettings } from "./site-content-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

// Required list/scalar fields on these settings models can come back `null` from the
// database (Json columns have no DB-level default), which would otherwise clobber the
// fallback content via a plain object spread. Only override a default when the fetched
// value is actually present.
function mergeDefined<T extends object>(defaults: T, data: Partial<T> | null | undefined): T {
  if (!data) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(data) as (keyof T)[]) {
    const value = data[key];
    if (value !== null && value !== undefined) {
      result[key] = value as T[keyof T];
    }
  }
  return result;
}

export async function getSiteContent(): Promise<SiteContentSettings> {
  try {
    const res = await fetch(`${BASE_URL}/site-content`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_SITE_CONTENT;
    const data = await res.json();
    return mergeDefined(DEFAULT_SITE_CONTENT, data);
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export async function getFooterSettings(): Promise<FooterSettingsData> {
  try {
    const res = await fetch(`${BASE_URL}/footer`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_FOOTER_SETTINGS;
    const data = await res.json();
    return mergeDefined(DEFAULT_FOOTER_SETTINGS, data);
  } catch {
    return DEFAULT_FOOTER_SETTINGS;
  }
}

export async function getFooterPages(): Promise<LegalPageSummary[]> {
  try {
    const res = await fetch(`${BASE_URL}/pages/footer`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export type PageFetchResult =
  | { status: "ok"; page: LegalPage }
  | { status: "not-found" }
  | { status: "forbidden" };

// Anonim (sunucu tarafı) istek — kullanıcının JWT'si localStorage'da tutulduğundan
// SSR sırasında erişilemez. Sayfa herkese açıksa (visibility boş) doğrudan içerik
// döner; visibility kısıtlıysa backend 403 döner ve gerçek yetki kontrolü istemci
// tarafında (giriş yapmış kullanıcının token'ıyla) ayrıca yapılır.
export async function getPageBySlug(slug: string): Promise<PageFetchResult> {
  try {
    const res = await fetch(`${BASE_URL}/pages/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) return { status: "not-found" };
    if (res.status === 403) return { status: "forbidden" };
    if (!res.ok) return { status: "not-found" };
    const page = await res.json();
    return { status: "ok", page };
  } catch {
    return { status: "not-found" };
  }
}

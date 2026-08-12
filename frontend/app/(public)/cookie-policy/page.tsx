import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/marketing/legal-document";
import { RestrictedPageGate } from "@/components/marketing/restricted-page-gate";
import { getPageBySlug, getSiteContent, getFooterPages } from "@/lib/marketing/get-site-content";

const SLUG = "cookie-policy";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "traders.tr'de kullanılan çerezler ve benzeri teknolojiler hakkında bilgi.",
};

export default async function CookiePolicyPage() {
  const [result, siteContent, relatedPages] = await Promise.all([
    getPageBySlug(SLUG),
    getSiteContent(),
    getFooterPages(),
  ]);
  const heroImageSrc = siteContent.heroImageUrl ?? undefined;

  if (result.status === "not-found") notFound();
  if (result.status === "forbidden") {
    return <RestrictedPageGate slug={SLUG} heroImageSrc={heroImageSrc} />;
  }

  return (
    <LegalDocument
      title={result.page.title}
      blocks={result.page.blocks}
      heroImageSrc={heroImageSrc}
      currentSlug={SLUG}
      relatedPages={relatedPages}
    />
  );
}

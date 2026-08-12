import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/marketing/legal-document";
import { RestrictedPageGate } from "@/components/marketing/restricted-page-gate";
import { getPageBySlug, getSiteContent, getFooterPages } from "@/lib/marketing/get-site-content";

const SLUG = "privacy-policy";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "ORCA platformunda kişisel verilerin işlenmesine ilişkin gizlilik politikası.",
};

export default async function PrivacyPolicyPage() {
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

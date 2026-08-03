import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { FaqContent } from "@/components/marketing/faq-content";
import { FAQ_CATEGORIES } from "@/lib/marketing/faq-data";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular | ORCA",
  description:
    "ORCA hakkında merak edilenler: eğitimler, Yapay Zeka Mentor, üyelik ve ödeme, simülasyon & backtest, teknik konular, topluluk ve güven ile ilgili tüm sorulara yanıt bulun.",
};

export default async function FaqPage() {
  const siteContent = await getSiteContent();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((category) =>
      category.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageHero title="Sıkça Sorulan Sorular" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <FaqContent categories={FAQ_CATEGORIES} />
    </>
  );
}

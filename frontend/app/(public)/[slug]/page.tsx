import { notFound } from "next/navigation";
import { getPageBySlug, getSiteContent } from "@/lib/marketing/get-site-content";
import { PageBlocksRenderer } from "@/components/marketing/page-blocks-renderer";
import { RestrictedPageGate } from "@/components/marketing/restricted-page-gate";
import { PageHero } from "@/components/marketing/page-hero";

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, siteContent] = await Promise.all([getPageBySlug(slug), getSiteContent()]);
  const heroImageSrc = siteContent.heroImageUrl ?? undefined;

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "forbidden") {
    // Sayfa var ama visibility kısıtlı — gerçek yetki kontrolü istemci tarafında yapılır.
    return <RestrictedPageGate slug={slug} heroImageSrc={heroImageSrc} />;
  }

  const { page } = result;

  return (
    <>
      <PageHero title={page.title} heroImageSrc={heroImageSrc} />
      <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
        <PageBlocksRenderer blocks={page.blocks} />
      </div>
    </>
  );
}

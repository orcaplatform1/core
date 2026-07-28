import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/marketing/get-site-content";
import { PageBlocksRenderer } from "@/components/marketing/page-blocks-renderer";
import { RestrictedPageGate } from "@/components/marketing/restricted-page-gate";

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPageBySlug(slug);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "forbidden") {
    // Sayfa var ama visibility kısıtlı — gerçek yetki kontrolü istemci tarafında yapılır.
    return <RestrictedPageGate slug={slug} />;
  }

  const { page } = result;

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">{page.title}</h1>
      <div className="mt-8">
        <PageBlocksRenderer blocks={page.blocks} />
      </div>
    </div>
  );
}

"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { usePageBySlug } from "@/lib/hooks/use-admin-pages";
import { PageBlocksRenderer } from "@/components/marketing/page-blocks-renderer";

export default function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: page, isLoading, error } = usePageBySlug(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-card" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto flex max-w-[800px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <p className="text-base text-muted-foreground">
          Bu sayfayı görüntülemek için giriş yapmanız veya yetkili bir hesapla giriş yapmanız gerekiyor.
        </p>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Giriş yap
        </Link>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    notFound();
  }

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">{page.title}</h1>
      <div className="mt-8">
        <PageBlocksRenderer blocks={page.blocks} />
      </div>
    </div>
  );
}

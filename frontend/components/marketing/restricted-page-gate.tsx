"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { PageBlock } from "@/lib/marketing/page-blocks-types";
import { PageBlocksRenderer } from "./page-blocks-renderer";

type RestrictedPage = { title: string; blocks: PageBlock[] };

// Bu bileşen yalnızca visibility kısıtlı sayfalar için devreye girer (üst server
// component zaten anonim istekte 403 aldı). JWT localStorage'da tutulduğundan
// (cookie değil) yetki kontrolü ancak istemci tarafında, giriş yapmış kullanıcının
// token'ı ile yeniden istek atılarak yapılabilir.
export function RestrictedPageGate({ slug }: { slug: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["page", slug, "restricted"],
    queryFn: () => apiClient<RestrictedPage>(`/pages/${slug}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-card" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    notFound();
  }

  if (!data) {
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

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">{data.title}</h1>
      <div className="mt-8">
        <PageBlocksRenderer blocks={data.blocks} />
      </div>
    </div>
  );
}

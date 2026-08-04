"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Lock, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommunityFeed, useCommunityPost } from "@/lib/hooks/use-community";
import { CommunityPostCard } from "./community-post-card";
import { CreatePostSheet } from "./create-post-sheet";

const SORT_TABS = [
  { value: "newest", label: "En Yeni" },
  { value: "top", label: "En Çok Beğenilen" },
] as const;

export function CommunityContent() {
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [symbolInput, setSymbolInput] = useState("");
  const [symbol, setSymbol] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityFeed({ sort, symbol: symbol || undefined, page });

  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedPostId = searchParams.get("post");
  const { data: linkedPost } = useCommunityPost(linkedPostId);
  const linkedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (linkedPost && linkedRef.current) {
      linkedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [linkedPost]);

  function applySymbolFilter() {
    setSymbol(symbolInput.trim());
    setPage(1);
  }

  function clearLinkedPost() {
    router.replace("/community");
  }

  const canInteract = !!data?.viewer.isEnrolled;
  const postsToday = data?.viewer.postsToday ?? 0;
  const dailyPostLimit = data?.viewer.dailyPostLimit ?? 3;

  // Bildirimden gelen ?post= linki her zaman en yeni sayfada olmayabilir
  // (farkli sirlama/sayfalama) - o yuzden akistan ayri, kendi vurgulanmis
  // kartinda gosterilip ana listeden tekrar etmemesi icin filtrelenir.
  const feedPosts = (data?.posts ?? []).filter((p) => p.id !== linkedPostId);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Öğrenci Analizleri</p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Grafik analizlerini paylaş, diğer öğrencilerin fikirlerini incele, geri bildirim ver.
          </p>
        </div>
        {canInteract ? (
          <CreatePostSheet postsToday={postsToday} dailyPostLimit={dailyPostLimit} />
        ) : (
          <Button variant="gradient" render={<Link href="/subscription" />}>
            <Lock className="size-4" /> Paylaşım Yap
          </Button>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-border overflow-hidden w-fit">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSort(tab.value);
                setPage(1);
              }}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                sort === tab.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySymbolFilter()}
            onBlur={applySymbolFilter}
            placeholder="Sembol filtrele (örn. BTCUSDT)"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {data?.pinnedPost && (
        <div className="mb-8">
          <CommunityPostCard post={data.pinnedPost} canInteract={canInteract} featured />
        </div>
      )}

      {linkedPost && (
        <div ref={linkedRef} className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Bağlantılı gönderi</p>
            <button
              type="button"
              onClick={clearLinkedPost}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Kapat
            </button>
          </div>
          <CommunityPostCard post={linkedPost} canInteract={canInteract} highlighted />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : feedPosts.length === 0 && !data?.pinnedPost ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-20 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {symbol ? `"${symbol}" için henüz paylaşım yok.` : "Henüz paylaşım yok. İlk analizi sen paylaş!"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feedPosts.map((post) => (
              <CommunityPostCard key={post.id} post={post} canInteract={canInteract} />
            ))}
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`size-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

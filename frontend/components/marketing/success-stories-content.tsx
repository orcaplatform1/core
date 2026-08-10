"use client";
import { Star } from "lucide-react";
import { usePublicSuccessStories } from "@/lib/hooks/use-success-stories";

export function SuccessStoriesContent() {
  const { data: stories, isLoading } = usePublicSuccessStories();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (!stories || stories.length === 0) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-14 text-center sm:px-6 lg:px-8">
        <p className="text-body-sm text-muted-foreground">
          Henüz yayınlanmış bir başarı hikayesi yok — ilk mezun sen olabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {stories.map((s) => (
          <article key={s.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              {s.user.avatarUrl ? (
                <img src={s.user.avatarUrl} alt={s.user.fullName} className="size-10 rounded-full object-cover" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-body-sm font-medium text-primary">
                  {s.user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-body-sm font-medium text-foreground">{s.user.fullName}</p>
                <p className="flex items-center gap-1 text-body-xs text-muted-foreground">
                  <Star size={11} className="text-[#D9A441]" /> ORCA Mezunu
                </p>
              </div>
            </div>
            <h3 className="text-card-title-sm text-foreground">{s.title}</h3>
            <p className="whitespace-pre-wrap text-body-sm text-muted-foreground">{s.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

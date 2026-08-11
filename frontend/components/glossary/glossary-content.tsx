"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLOSSARY, GLOSSARY_CATEGORY_LABELS, type GlossaryCategory } from "@/lib/data/glossary";

type FilterValue = "tumu" | GlossaryCategory;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "tumu", label: "Tümü" },
  { value: "kripto", label: "Kripto" },
  { value: "borsa", label: "Borsa" },
  { value: "forex", label: "Forex" },
];

const CATEGORY_DOT: Record<GlossaryCategory, string> = {
  kripto: "bg-purple",
  borsa: "bg-success",
  forex: "bg-primary",
};

export function GlossaryContent() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("tumu");

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    // Arama yazılınca aktif toggle'dan bağımsız olarak üç kategoride de arar;
    // arama boşken toggle'a göre filtrelenir (kullanıcı gezinmeden bulabilsin).
    const base = q
      ? GLOSSARY.filter(
          (g) => g.term.toLocaleLowerCase("tr").includes(q) || g.definition.toLocaleLowerCase("tr").includes(q)
        )
      : filter === "tumu"
        ? GLOSSARY
        : GLOSSARY.filter((g) => g.category === filter);

    return [...base].sort((a, b) => a.term.localeCompare(b.term, "tr"));
  }, [query, filter]);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="premium-glow-card sticky top-[88px] z-10 flex flex-col gap-4 bg-card p-5 sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Terim ara... (kripto, borsa, forex hepsinde birden arar)"
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 pl-10 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-tag transition-colors duration-200",
                filter === f.value
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-body-xs text-muted-foreground">
        {results.length} terim {query.trim() ? `"${query.trim()}" için bulundu` : "listeleniyor"}
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {results.map((g) => (
          <div key={g.term} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", CATEGORY_DOT[g.category])} />
              <span className="text-body-xs text-muted-foreground">{GLOSSARY_CATEGORY_LABELS[g.category]}</span>
            </div>
            <h3 className="mt-1.5 text-card-title-sm text-foreground">{g.term}</h3>
            <p className="mt-1 text-body-sm text-muted-foreground">{g.definition}</p>
          </div>
        ))}
        {results.length === 0 && (
          <p className="py-10 text-center text-body-sm text-muted-foreground">Sonuç bulunamadı.</p>
        )}
      </div>
    </div>
  );
}

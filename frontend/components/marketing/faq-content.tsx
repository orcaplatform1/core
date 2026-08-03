"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Info,
  GraduationCap,
  Bot,
  CreditCard,
  LineChart,
  Wrench,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { FaqCategory } from "@/lib/marketing/faq-data";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  genel: Info,
  egitimler: GraduationCap,
  "yapay-zeka-mentor": Bot,
  "uyelik-odeme": CreditCard,
  "simulasyon-backtest": LineChart,
  teknik: Wrench,
  topluluk: Users,
  guven: ShieldCheck,
};

export function FaqContent({ categories }: { categories: FaqCategory[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.question.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, normalizedQuery]);

  const isSearching = normalizedQuery.length > 0;

  function scrollToCategory(id: string) {
    setActiveCategory(id);
    document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="relative mx-auto mb-10 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sorularda ara..."
          className="h-11 rounded-xl border-border bg-card pl-10 text-sm"
        />
      </div>

      {/* Mobil: yatay kaydırmalı kategori sekmeleri */}
      <div
        className="-mx-4 mb-8 overflow-x-auto px-4 pb-1 lg:hidden
          [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
          [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="flex gap-2">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id] ?? Info;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  activeCategory === category.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-10">
        {/* Masaüstü: sticky sol navigasyon */}
        <nav className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-[96px] flex flex-col gap-1">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.id] ?? Info;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => scrollToCategory(category.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    activeCategory === category.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {filteredCategories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              &quot;{query}&quot; için sonuç bulunamadı.
            </p>
          ) : (
            <div className="flex flex-col gap-12">
              {filteredCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id] ?? Info;
                return (
                  <section key={category.id} id={`faq-${category.id}`} className="scroll-mt-24">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">{category.label}</h2>
                    </div>

                    <Accordion
                      multiple
                      defaultValue={isSearching ? category.items.map((item) => item.id) : []}
                      className="rounded-2xl border border-border bg-card px-4 sm:px-5"
                    >
                      {category.items.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger className="py-4 text-sm font-semibold text-foreground hover:no-underline sm:text-[15px]">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

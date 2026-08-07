"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ToolsNavItem = {
  label: string;
  href: string;
};

export function ToolsNav({ items, exact = false }: { items: ToolsNavItem[]; exact?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {items.map((item) => {
        const active = exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3.5 py-2 text-tag transition-colors duration-200",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-card-hover hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

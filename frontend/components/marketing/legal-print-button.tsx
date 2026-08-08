"use client";

import { Printer } from "lucide-react";

export function LegalPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground print:hidden"
    >
      <Printer className="size-3.5" />
      Yazdır
    </button>
  );
}

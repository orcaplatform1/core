"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageBlock } from "@/lib/marketing/page-blocks-types";

const API = process.env.NEXT_PUBLIC_API_URL!;

function renderInline(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong> : part,
  );
}

/**
 * Yasal metin onayı: kutucuk ELLE işaretlenemez. "Metni aç ve oku" ile açılan pencerede metnin en altına inilince
 * "Okudum, anladım, kabul ediyorum" düğmesi aktifleşir; düğmeye basınca kutucuk otomatik işaretlenir.
 */
export function ConsentGate({ slug, title, label, accepted, onAccept }: { slug: string; title: string; label: string; accepted: boolean; onAccept: () => void }) {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<PageBlock[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const check = useCallback(() => {
    const el = scroller.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight <= 8) setAtEnd(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setAtEnd(false);
    if (blocks === null && !failed) {
      fetch(`${API}/pages/${slug}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((p) => setBlocks(p.blocks ?? [])).catch(() => setFailed(true));
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, slug, blocks, failed]);

  useEffect(() => {
    if (!open || blocks === null) return;
    const t = setTimeout(check, 100);
    return () => clearTimeout(t);
  }, [open, blocks, check]);

  return (
    <div className="flex items-start gap-3">
      <span
        role="checkbox"
        aria-checked={accepted}
        aria-readonly="true"
        aria-label={title}
        className={`pointer-events-none mt-0.5 grid h-5 w-5 flex-none place-items-center rounded border ${accepted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"}`}
      >
        {accepted && <Check className="h-3.5 w-3.5" aria-hidden />}
      </span>
      <div className="flex flex-col gap-1 text-body-sm text-muted-foreground">
        <span><strong className="font-medium text-foreground">{title}</strong>{label}</span>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-1.5 text-primary underline underline-offset-2 hover:opacity-80">
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> {accepted ? "Metni tekrar oku" : "Metni aç ve oku"}
        </button>
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <b className="text-base text-foreground">{title}</b>
              <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div ref={scroller} onScroll={check} tabIndex={0} className="flex-1 overflow-y-auto px-5 py-4 text-body-sm leading-relaxed text-muted-foreground">
              {blocks === null && !failed && <p>Yükleniyor…</p>}
              {failed && <p className="text-danger">Metin yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.</p>}
              {blocks?.map((b, i) => {
                if (b.type === "heading") return <h3 key={i} className="mb-2 mt-5 text-base font-semibold text-foreground">{b.text}</h3>;
                if (b.type === "paragraph") return <p key={i} className="mb-3">{renderInline(b.text)}</p>;
                if (b.type === "bulletList") return <ul key={i} className="mb-3 list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
                if (b.type === "divider") return <hr key={i} className="my-4 border-border" />;
                return null;
              })}
              {blocks && <p className="mt-6 text-center text-xs opacity-70">— Metnin sonu —</p>}
            </div>
            <div className="border-t border-border px-5 py-4">
              <p className="mb-2 text-center text-xs text-muted-foreground">{atEnd ? "Metnin sonuna geldin." : "Düğmenin aktifleşmesi için metni en alta kadar kaydır."}</p>
              <Button type="button" className="h-11 w-full" disabled={!atEnd} onClick={() => { onAccept(); setOpen(false); }}>Okudum, anladım, kabul ediyorum</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

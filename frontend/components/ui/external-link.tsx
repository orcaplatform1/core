"use client";

import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> & {
  href: string;
  children: ReactNode;
};

// Sitenin disina cikan TUM linkler bunu kullanmali: yeni sekmede acilir ve
// acilmadan once "buradan ayrilacaksiniz" onayi ister. Ic navigasyon (next/link)
// bundan etkilenmez, hep ayni sekmede kalir.
export function ExternalLink({ href, children, className, ...rest }: ExternalLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={className}
        {...rest}
      >
        {children}
      </a>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ExternalLinkIcon className="size-4 text-primary" /> Bu siteden ayrılıyorsunuz
            </AlertDialogTitle>
            <AlertDialogDescription>
              Şu an buradan ayrılacaksınız, emin misiniz?
              <span className="mt-2 block truncate rounded-lg border border-border bg-card-inner px-2 py-1 text-xs text-muted-foreground">
                {href}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(href, "_blank", "noopener,noreferrer");
                setOpen(false);
              }}
            >
              Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

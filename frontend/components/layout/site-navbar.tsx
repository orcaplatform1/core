"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LayoutDashboard, LogOut, Bot } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_SITE_CONTENT } from "@/lib/marketing/default-site-content";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";
import { SiteLogo } from "@/components/layout/site-logo";
import { AiMentorPreviewCard } from "@/components/marketing/ai-mentor-preview-card";

export function SiteNavbar({
  siteContent = DEFAULT_SITE_CONTENT,
}: {
  siteContent?: SiteContentSettings;
}) {
  const [open, setOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const publicLinks = siteContent.navLinks;

  return (
    <header className="sticky top-0 z-50 h-[72px] w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center shrink-0">
          <SiteLogo siteContent={siteContent} textClassName="text-lg text-foreground" imgClassName="h-12" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-secondary-foreground/80 hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-secondary" />
          ) : user ? (
            <Button
              className="shadow-[0_0_20px_-4px_var(--glow-blue)]"
              render={
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" /> Dashboard&apos;a Git
                </Link>
              }
            />
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login">Giriş</Link>} />
              <Button
                className="shadow-[0_0_20px_-4px_var(--glow-blue)]"
                render={<Link href="/register">Kayıt Ol</Link>}
              />
            </>
          )}
          <div className="group relative hidden lg:block">
            <Link
              href={siteContent.aiMentorHref}
              className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary/15"
            >
              <Bot className="size-3.5" />
              {siteContent.aiMentorLabel}
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
            </Link>

            <div className="pointer-events-none absolute right-0 top-full z-50 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <AiMentorPreviewCard size="compact" className="w-[360px] max-w-[90vw]" />
            </div>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="md:hidden"
            render={
              <Button variant="ghost" size="icon" aria-label="Menü">
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent
            side="right"
            className="w-[300px] bg-sidebar border-l border-sidebar-border p-0"
          >
            <SheetTitle className="sr-only">Menü</SheetTitle>
            <div className="flex items-center justify-between h-[72px] px-5 border-b border-sidebar-border">
              <SiteLogo siteContent={siteContent} imgClassName="h-8" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-2 p-5">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3.5 py-3 text-[15px] font-medium text-secondary-foreground/80 hover:bg-accent hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2">
                <AiMentorPreviewCard size="compact" className="w-full" />
              </div>

              <Separator className="my-1" />
              {user ? (
                <>
                  <Button
                    className="h-11 mt-1 text-[15px]"
                    onClick={() => setOpen(false)}
                    render={
                      <Link href="/dashboard">
                        <LayoutDashboard className="size-4" /> Dashboard&apos;a Git
                      </Link>
                    }
                  />
                  <Button
                    variant="outline"
                    className="h-11 mt-2 text-[15px]"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="size-4" /> Çıkış Yap
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-11 mt-1 text-[15px]"
                    onClick={() => setOpen(false)}
                    render={<Link href="/login">Giriş</Link>}
                  />
                  <Button
                    className="h-11 mt-2 text-[15px]"
                    onClick={() => setOpen(false)}
                    render={<Link href="/register">Kayıt Ol</Link>}
                  />
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

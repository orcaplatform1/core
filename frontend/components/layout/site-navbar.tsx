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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_SITE_CONTENT } from "@/lib/marketing/default-site-content";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";
import { SiteLogo } from "@/components/layout/site-logo";

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
            <>
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
                  <AvatarFallback>{user.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{user.fullName}</span>
              </Link>
              <Button
                className="shadow-[0_0_20px_-4px_var(--glow-blue)]"
                render={
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" /> Dashboard&apos;a Git
                  </Link>
                }
              />
            </>
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login">Giriş</Link>} />
              <Button
                className="shadow-[0_0_20px_-4px_var(--glow-blue)]"
                render={<Link href="/register">Kayıt Ol</Link>}
              />
            </>
          )}
          <Link
            href={siteContent.aiMentorHref}
            className="hidden lg:flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary/15"
          >
            <Bot className="size-3.5" />
            {siteContent.aiMentorLabel}
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
          </Link>
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
            className="w-[280px] bg-sidebar border-l border-sidebar-border p-0"
          >
            <SheetTitle className="sr-only">Menü</SheetTitle>
            <div className="flex items-center justify-between h-[72px] px-4 border-b border-sidebar-border">
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
            <nav className="flex flex-col gap-1 p-4">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary-foreground/80 hover:bg-accent hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
              <Separator />
              {user ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5">
                    <Avatar className="size-8">
                      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
                      <AvatarFallback>{user.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{user.fullName}</span>
                  </div>
                  <Button
                    className="mt-2"
                    onClick={() => setOpen(false)}
                    render={
                      <Link href="/dashboard">
                        <LayoutDashboard className="size-4" /> Dashboard&apos;a Git
                      </Link>
                    }
                  />
                  <Button
                    variant="outline"
                    className="mt-2"
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
                    className="mt-2"
                    onClick={() => setOpen(false)}
                    render={<Link href="/login">Giriş</Link>}
                  />
                  <Button
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

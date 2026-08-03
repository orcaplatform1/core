"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Bell, LogOut, User, ShieldAlert, Info, MessageCircle } from "lucide-react";
import { getNotificationSocket, disconnectNotificationSocket } from "@/lib/socket";
import {
  useMyNotifications,
  useUnreadCount,
  useAnnouncementUnreadCount,
  useMarkNotificationRead,
} from "@/lib/hooks/use-notifications";
import { useUnreadDmCount } from "@/lib/hooks/use-dm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { studentNav } from "@/lib/nav-config";
import { useAuth } from "@/context/auth-context";
import { SiteLogo } from "@/components/layout/site-logo";
import { DEFAULT_SITE_CONTENT } from "@/lib/marketing/default-site-content";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";
import { celebrate } from "@/lib/hooks/use-celebration";

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playTone(880, 0, 0.12);
    playTone(1175, 0.1, 0.15);
  } catch {
    // Autoplay engellenmis olabilir (kullanici henuz sayfayla etkilesime girmemis) — sessizce gec
  }
}

export function DashboardTopbar({
  siteContent = DEFAULT_SITE_CONTENT,
}: {
  siteContent?: SiteContentSettings;
}) {
  const sections = studentNav;
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = getNotificationSocket();
    if (!socket) return;
    const onNotification = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
    const onDm = () => {
      queryClient.invalidateQueries({ queryKey: ["dm"] });
    };
    socket.on("notification", onNotification);
    socket.on("announcement", onNotification);
    socket.on("dm:message", onDm);
    socket.on("dm:message-edited", onDm);
    return () => {
      socket.off("notification", onNotification);
      socket.off("announcement", onNotification);
      socket.off("dm:message", onDm);
      socket.off("dm:message-edited", onDm);
      disconnectNotificationSocket();
    };
  }, [user, queryClient]);

  const { data: notifications } = useMyNotifications();
  const { data: unread } = useUnreadCount();
  const { data: announcementUnread } = useAnnouncementUnreadCount();
  const { data: unreadDm } = useUnreadDmCount();
  const { mutate: markRead } = useMarkNotificationRead();
  const userName = user?.fullName ?? "Kullanici";
  const userAvatarUrl = user?.avatarUrl ?? undefined;
  const isPremium = user?.role === "STUDENT" && user?.toolsSubscription === "ACTIVE";

  const totalUnread = (unread?.count ?? 0) + (announcementUnread?.count ?? 0);
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread]);

  // Referans ödülü hediye kredisi eklendiği an — yeni gelen bildirimi tespit edip confetti tetikler.
  const prevNotifIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!notifications) return;
    const currentIds = new Set(notifications.map((n) => n.id));
    if (prevNotifIdsRef.current) {
      const isNew = (n: (typeof notifications)[number]) => !prevNotifIdsRef.current!.has(n.id);
      if (notifications.some((n) => isNew(n) && n.type === "REFERRAL_REWARD")) {
        celebrate();
      }
    }
    prevNotifIdsRef.current = currentIds;
  }, [notifications]);

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="md:hidden"
          render={
            <Button variant="ghost" size="icon" aria-label="Menü">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-[280px] bg-sidebar border-r border-sidebar-border p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <div className="flex items-center h-[72px] px-4 border-b border-sidebar-border">
            <SiteLogo siteContent={siteContent} textClassName="text-sidebar-foreground" imgClassName="h-8" />
          </div>
          {user?.role === "SUPER_ADMIN" && (
            <div className="px-3 pt-3">
              <Link
                href="/manage"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200"
                style={{ backgroundColor: "#EF44441A", color: "#EF4444" }}
              >
                <ShieldAlert className="size-5 shrink-0" />
                M Dashboard
              </Link>
            </div>
          )}
          <nav className="flex flex-col gap-6 p-3">
            {sections.map((section, i) => (
              <div key={i} className="flex flex-col gap-1">
                {section.title && (
                  <span className="px-3 mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                    {section.title}
                  </span>
                )}
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-200"
                  >
                    <item.icon className="size-5 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Mesajlar"
          render={<Link href="/messages" />}
        >
          <MessageCircle className="size-5" />
          {!!unreadDm?.count && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unreadDm.count > 9 ? "9+" : unreadDm.count}
            </span>
          )}
        </Button>
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
                <Bell className="size-5" />
                {!!totalUnread && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">Bildirimler</span>
              <Link
                href="/notifications"
                onClick={() => setNotifOpen(false)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Tümünü gör
              </Link>
            </div>
            <div className="flex max-h-80 flex-col overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  <Bell className="mx-auto mb-2 size-6 text-muted-foreground" />
                  Henüz bildirimin yok.
                </div>
              ) : (
                notifications.slice(0, 6).map((n) => {
                  const handleClick = () => {
                    if (!n.read) markRead(n.id);
                    setNotifOpen(false);
                  };
                  const row = (
                    <div
                      className={`flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent ${
                        n.read ? "" : "bg-primary/5"
                      }`}
                    >
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      </div>
                      {!n.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={handleClick}>
                      {row}
                    </Link>
                  ) : (
                    <button key={n.id} onClick={handleClick} className="w-full">
                      {row}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent transition-colors duration-200">
                <Avatar className="size-8">
                  <AvatarImage src={userAvatarUrl} alt={userName} />
                  <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:flex sm:flex-col sm:items-start sm:leading-tight">
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                  {isPremium && (
                    <span className="text-[10px] font-semibold text-primary">Premium Üye</span>
                  )}
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem render={<Link href="/profile"><User className="size-4 mr-2" /> Profil</Link>} />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:text-danger cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="size-4 mr-2" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

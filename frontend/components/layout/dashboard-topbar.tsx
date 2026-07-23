"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, Bell, LogOut, User, CheckCheck, ShieldAlert, Megaphone } from "lucide-react";
import {
  useMyNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMyAnnouncements,
  useAnnouncementUnreadCount,
  useMarkAllAnnouncementsRead,
} from "@/lib/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { studentNav } from "@/lib/nav-config";
import { useAuth } from "@/context/auth-context";

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

export function DashboardTopbar() {
  const sections = studentNav;
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: notifications } = useMyNotifications();
  const { data: unread } = useUnreadCount();
  const { data: announcements } = useMyAnnouncements();
  const { data: announcementUnread } = useAnnouncementUnreadCount();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { mutate: markAllAnnouncementsRead } = useMarkAllAnnouncementsRead();
  const userName = user?.fullName ?? "Kullanici";
  const userAvatarUrl = user?.avatarUrl ?? undefined;

  const totalUnread = (unread?.count ?? 0) + (announcementUnread?.count ?? 0);
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread]);

  const merged = [
    ...(notifications ?? []),
    ...(announcements ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleItemClick(id: string, read: boolean, type: string) {
    if (read) return;
    markRead(id);
    if (type === "ANNOUNCEMENT") markAllAnnouncementsRead();
  }

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
            <span className="font-bold text-sidebar-foreground">
              ORCA <span className="text-primary">TRADERS</span>
            </span>
          </div>
          {user?.role === "SUPER_ADMIN" && (
            <div className="px-3 pt-3">
              <Link
                href="/manage"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200"
                style={{ backgroundColor: "#FF5C5C1A", color: "#FF5C5C" }}
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
                <Bell className="size-5" />
                {!!totalUnread && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-foreground">Bildirimler</span>
              {!!totalUnread && (
                <button
                  onClick={() => {
                    markAllRead();
                    markAllAnnouncementsRead();
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="size-3" /> Tümünü okundu işaretle
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {merged.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Henüz bildirimin yok.
                </p>
              ) : (
                merged.slice(0, 8).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex flex-col items-start gap-0.5 whitespace-normal py-2 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleItemClick(n.id, n.read, n.type)}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      {n.type === "ANNOUNCEMENT" && <Megaphone className="size-3 text-primary" />}
                      {n.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/notifications">Tüm Bildirimleri Gör</Link>} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent transition-colors duration-200">
                <Avatar className="size-8">
                  <AvatarImage src={userAvatarUrl} alt={userName} />
                  <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {userName}
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

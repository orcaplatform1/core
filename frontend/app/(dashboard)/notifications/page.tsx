"use client";

import Link from "next/link";
import {
  Bell,
  Megaphone,
  CheckCheck,
  GraduationCap,
  BookOpen,
  LineChart,
  Sparkles,
  Award,
  Radio,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  useMyNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMyAnnouncements,
  useAnnouncementUnreadCount,
  useMarkAllAnnouncementsRead,
} from "@/lib/hooks/use-notifications";
import type { Notification } from "@/lib/types/curriculum";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const typeIcons: Record<Notification["type"], LucideIcon> = {
  NEW_LESSON: BookOpen,
  NEW_PROGRAM: GraduationCap,
  QUIZ_RESULT: LineChart,
  AI_SUGGESTION: Sparkles,
  CERTIFICATE_READY: Award,
  ANNOUNCEMENT: Megaphone,
  LIVE_LESSON_REMINDER: Radio,
  SYSTEM: Info,
};

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  const Icon = typeIcons[notification.type] ?? Info;
  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl p-4 transition-colors duration-200 ${
        notification.read ? "bg-card" : "card-inner"
      } hover:bg-[var(--card-hover)]`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {!notification.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading: loadingNotifs } = useMyNotifications();
  const { data: unread } = useUnreadCount();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const { data: announcements, isLoading: loadingAnn } = useMyAnnouncements();
  const { data: unreadAnn } = useAnnouncementUnreadCount();
  const { mutate: markAllAnnRead } = useMarkAllAnnouncementsRead();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Bell className="size-6 text-primary" /> Bildirimler
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ders, quiz, sertifika ve duyuru bildirimlerini buradan takip et.
        </p>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">
            Bildirimler{!!unread?.count && ` (${unread.count})`}
          </TabsTrigger>
          <TabsTrigger value="announcements">
            Duyurular{!!unreadAnn?.count && ` (${unreadAnn.count})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4 flex flex-col gap-3">
          {!!unread?.count && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="size-3.5" /> Tümünü okundu işaretle
            </Button>
          )}
          {loadingNotifs ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Henüz bildirimin yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => !n.read && markRead(n.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4 flex flex-col gap-3">
          {!!unreadAnn?.count && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => markAllAnnRead()}
            >
              <CheckCheck className="size-3.5" /> Tümünü okundu işaretle
            </Button>
          )}
          {loadingAnn ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          ) : !announcements || announcements.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Megaphone className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Henüz bir duyuru yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {announcements.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

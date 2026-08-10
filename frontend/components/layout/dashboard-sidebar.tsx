"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Flame, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { studentNav } from "@/lib/nav-config";
import { useMyStats } from "@/lib/hooks/use-dashboard";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SiteLogo } from "@/components/layout/site-logo";
import { DEFAULT_SITE_CONTENT } from "@/lib/marketing/default-site-content";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";

export function DashboardSidebar({
  siteContent = DEFAULT_SITE_CONTENT,
  collapsed,
  onToggleCollapsed,
}: {
  siteContent?: SiteContentSettings;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const sections = studentNav;
  const pathname = usePathname();
  const { data: stats } = useMyStats();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar transition-[width] duration-[220ms]",
        collapsed ? "w-[88px]" : "w-[232px]"
      )}
    >
      <div className="flex items-center h-[72px] px-4 border-b border-sidebar-border shrink-0">
        <SiteLogo
          siteContent={siteContent}
          textClassName="text-sidebar-foreground"
          imgClassName="h-9"
          collapsed={collapsed}
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col items-center gap-2 border-b border-sidebar-border px-4 py-5">
          <Avatar className="size-14 ring-2 ring-primary/25">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.fullName} />
            <AvatarFallback>{user?.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-body-xs text-sidebar-foreground/70">
            @{user?.username}
          </span>
        </div>
      )}

      {user?.role === "SUPER_ADMIN" && (
        <div className="px-3 pt-3">
          <Link
            href="/manage"
            className={cn(
              "text-nav-active flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200",
              pathname?.startsWith("/manage") ? "ring-1 ring-[#EF4444]" : "",
              collapsed && "justify-center px-0"
            )}
            style={{ backgroundColor: "#EF44441A", color: "#EF4444" }}
          >
            <ShieldAlert className="size-5 shrink-0" />
            {!collapsed && <span>M Dashboard</span>}
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
        {sections.map((section, i) => (
          <div key={i} className="flex flex-col gap-1">
            {section.title && !collapsed && (
              <span className="text-body-xs px-3 mb-1 uppercase tracking-wide text-text-muted">
                {section.title}
              </span>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200",
                    active
                      ? "text-nav-active sidebar-active-item"
                      : "text-sidebar text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="text-badge ml-auto rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={link} />
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="flex flex-col gap-3 border-t border-sidebar-border p-3">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-purple/10 opacity-40 blur-xl" />
            <div className="relative overflow-hidden rounded-xl border border-purple/25 bg-gradient-to-b from-purple/[0.08] to-card p-4 shadow-[0_16px_40px_-20px_rgba(139,92,246,0.35)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple/50 to-transparent" />
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-purple" />
                <span className="text-widget-title text-foreground">Günlük Çalışma Serisi</span>
              </div>
              <p className="text-num-md mt-2 text-foreground">
                {stats?.currentStreak ?? 0} <span className="text-widget-desc text-muted-foreground">gün</span>
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-purple transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((stats?.currentStreak ?? 0) / 30) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Hedef: 30 gün</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onToggleCollapsed}
        className="flex items-center justify-center h-11 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors duration-200"
        aria-label={collapsed ? "Genişlet" : "Daralt"}
      >
        {collapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
      </button>
    </aside>
  );
}

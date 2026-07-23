"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Flame, ShieldAlert } from "lucide-react";
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
import { Button } from "@/components/ui/button";

export function DashboardSidebar() {
  const sections = studentNav;
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: stats } = useMyStats();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar transition-[width] duration-[220ms]",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div className="flex items-center h-[72px] px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <span className="font-bold text-sidebar-foreground">
            ORCA <span className="text-primary">TRADERS</span>
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="flex flex-col items-center gap-2 border-b border-sidebar-border px-4 py-5">
          <Avatar className="size-14 ring-2 ring-primary/25">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.fullName} />
            <AvatarFallback>{user?.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-sidebar-foreground/70">
            @{user?.username}
          </span>
        </div>
      )}

      {user?.role === "SUPER_ADMIN" && (
        <div className="px-3 pt-3">
          <Link
            href="/manage"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
              pathname?.startsWith("/manage") ? "ring-1 ring-[#FF5C5C]" : "",
              collapsed && "justify-center px-0"
            )}
            style={{ backgroundColor: "#FF5C5C1A", color: "#FF5C5C" }}
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
              <span className="px-3 mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                {section.title}
              </span>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href;
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                    active
                      ? "sidebar-active-item"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
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
          <div className="rounded-xl bg-gradient-to-br from-primary/20 via-purple/10 to-transparent border border-primary/20 p-4">
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">ORCA Premium</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tüm özelliklere erişin, gelişiminizi katlayın.
            </p>
            <Button size="sm" className="mt-3 h-8 w-full">
              Premium&apos;a Geç
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-purple" />
              <span className="text-sm font-semibold text-foreground">Günlük Çalışma Serisi</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {stats?.currentStreak ?? 0} <span className="text-sm font-medium text-muted-foreground">gün</span>
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
      )}

      <button
        onClick={() => setCollapsed((c) => !c)}
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

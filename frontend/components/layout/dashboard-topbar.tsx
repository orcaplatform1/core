"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Bell, LogOut, User } from "lucide-react";
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

export function DashboardTopbar() {
  const sections = studentNav;
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const userName = user?.fullName ?? "Kullanici";
  const userAvatarUrl = user?.avatarUrl ?? undefined;

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
        <SheetContent side="left" className="w-[280px] bg-sidebar border-r border-sidebar-border p-0">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <div className="flex items-center h-[72px] px-4 border-b border-sidebar-border">
            <span className="font-bold text-sidebar-foreground">
              ORCA <span className="text-primary">TRADERS</span>
            </span>
          </div>
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
        <Button variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
        </Button>

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

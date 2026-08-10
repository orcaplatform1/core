"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { VerificationGate } from "@/components/layout/verification-gate";
import type { FooterSettingsData, SiteContentSettings } from "@/lib/marketing/site-content-types";

// Sidebar'in daraltilmis/genis hali burada, ikisi arasindaki ortak atada
// tutuluyor - eskiden bu state sadece DashboardSidebar'in kendi icinde
// yasiyordu, icerik alaninin sol bosluguna hic yansimiyordu (sidebar simgeye
// kuculuyor ama icerik ayni genislikte kalip bosluk aciliyordu).
export function DashboardShell({
  siteContent,
  footer,
  children,
}: {
  siteContent: SiteContentSettings;
  footer: FooterSettingsData;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        siteContent={siteContent}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div
        className={cn(
          "transition-[padding] duration-[220ms]",
          collapsed ? "md:pl-[88px]" : "md:pl-[232px]"
        )}
      >
        <DashboardTopbar siteContent={siteContent} />
        <main className="p-8">
          <VerificationGate>{children}</VerificationGate>
        </main>
        <DashboardFooter footer={footer} />
      </div>
    </div>
  );
}

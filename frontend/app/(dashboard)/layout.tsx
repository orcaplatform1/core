import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { DashboardGuard } from "@/components/layout/dashboard-guard";
import { VerificationGate } from "@/components/layout/verification-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteContent = await getSiteContent();

  return (
    <DashboardGuard>
      <TooltipProvider delay={150}>
        <div className="min-h-screen bg-background">
          <DashboardSidebar siteContent={siteContent} />
          <div className="md:pl-[280px] transition-[padding] duration-[220ms]">
            <DashboardTopbar siteContent={siteContent} />
            <main className="p-8">
            <VerificationGate>{children}</VerificationGate>
          </main>
          </div>
        </div>
      </TooltipProvider>
    </DashboardGuard>
  );
}

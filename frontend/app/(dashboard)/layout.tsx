import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { DashboardGuard } from "@/components/layout/dashboard-guard";
import { VerificationGate } from "@/components/layout/verification-gate";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <TooltipProvider delay={150}>
        <div className="min-h-screen bg-background">
          <DashboardSidebar />
          <div className="md:pl-[280px] transition-[padding] duration-[220ms]">
            <DashboardTopbar />
            <main className="p-8">
            <VerificationGate>{children}</VerificationGate>
          </main>
          </div>
        </div>
      </TooltipProvider>
    </DashboardGuard>
  );
}

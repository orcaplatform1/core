import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardGuard } from "@/components/layout/dashboard-guard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CelebrationOverlay } from "@/components/ui/celebration";
import { getFooterSettings, getSiteContent } from "@/lib/marketing/get-site-content";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siteContent, footer] = await Promise.all([getSiteContent(), getFooterSettings()]);

  return (
    <DashboardGuard>
      <TooltipProvider delay={150}>
        <CelebrationOverlay />
        <DashboardShell siteContent={siteContent} footer={footer}>
          {children}
        </DashboardShell>
      </TooltipProvider>
    </DashboardGuard>
  );
}

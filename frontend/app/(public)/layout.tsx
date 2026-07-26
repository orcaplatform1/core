import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { getFooterSettings, getSiteContent } from "@/lib/marketing/get-site-content";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siteContent, footer] = await Promise.all([getSiteContent(), getFooterSettings()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar siteContent={siteContent} />
      <main className="flex-1">{children}</main>
      <SiteFooter footer={footer} />
    </div>
  );
}

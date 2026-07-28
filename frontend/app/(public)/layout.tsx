import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { getFooterPages, getFooterSettings, getSiteContent } from "@/lib/marketing/get-site-content";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siteContent, footer, legalPages] = await Promise.all([
    getSiteContent(),
    getFooterSettings(),
    getFooterPages(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar siteContent={siteContent} />
      <main className="flex-1">{children}</main>
      <SiteFooter footer={footer} legalPages={legalPages} />
    </div>
  );
}

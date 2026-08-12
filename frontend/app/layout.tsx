import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { getSiteContent } from "@/lib/marketing/get-site-content";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
});

const SITE_URL = "https://traders.tr/core";
const SITE_DESCRIPTION =
  "Yapay zeka destekli finans ve trading eğitim platformu - kripto, borsa ve forex eğitimleri, canlı piyasa araçları ve AI Mentor.";

export async function generateMetadata(): Promise<Metadata> {
  const siteContent = await getSiteContent();
  const ogImage = siteContent.heroImageUrl
    ? new URL(siteContent.heroImageUrl, SITE_URL).toString()
    : `${SITE_URL}/marketing/orca-hero-whale.webp`;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "ORCA - Finans ve Trading Eğitim Platformu",
      template: "%s | ORCA",
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "ORCA",
      title: "ORCA - Finans ve Trading Eğitim Platformu",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "ORCA" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ORCA - Finans ve Trading Eğitim Platformu",
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
    icons: siteContent.faviconUrl
      ? {
          // sizes/type belirtmezsek bazı tarayıcılar görseli tek boyut varsayıp
          // olduğu gibi (kırpılmamışsa etrafındaki boşlukla) küçük render ediyor;
          // aynı görseli standart favicon boyutlarında ayrı <link> olarak bildirmek
          // tarayıcının en yakın boyutu seçmesini sağlıyor.
          icon: [
            { url: siteContent.faviconUrl, sizes: "32x32", type: "image/png" },
            { url: siteContent.faviconUrl, sizes: "16x16", type: "image/png" },
            { url: siteContent.faviconUrl, sizes: "192x192", type: "image/png" },
          ],
          apple: { url: siteContent.faviconUrl, sizes: "180x180", type: "image/png" },
          shortcut: siteContent.faviconUrl,
        }
      : undefined,
  };
}

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "ORCA",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foreground">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { getSiteContent } from "@/lib/marketing/get-site-content";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteContent = await getSiteContent();
  return {
    title: "ORCA",
    description: "Yapay zeka destekli finans ve trading eğitim platformu",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foreground">
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

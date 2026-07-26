import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getSiteContent } from "@/lib/marketing/get-site-content";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteContent = await getSiteContent();
  return {
    title: "ORCA TRADERS",
    description: "Yapay zeka destekli finans ve trading eğitim platformu",
    icons: siteContent.faviconUrl ? { icon: siteContent.faviconUrl } : undefined,
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

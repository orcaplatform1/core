import { ToolsNav } from "@/components/tools/tools-nav";

const CRYPTO_NAV_ITEMS = [
  { label: "Genel Bakış", href: "/tools/crypto" },
  { label: "Kripto Takvim", href: "/tools/crypto/calendar" },
  { label: "ICO'lar", href: "/tools/crypto/ico" },
  { label: "Airdrop'lar", href: "/tools/crypto/airdrops" },
  { label: "Kilit Açılışı", href: "/tools/crypto/unlocks" },
  { label: "Balina Hareketleri", href: "/tools/crypto/whales" },
  { label: "Onchain", href: "/tools/crypto/onchain" },
  { label: "Haber Sentiment", href: "/tools/crypto/sentiment" },
];

export default function CryptoToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <ToolsNav items={CRYPTO_NAV_ITEMS} exact />
      {children}
    </div>
  );
}

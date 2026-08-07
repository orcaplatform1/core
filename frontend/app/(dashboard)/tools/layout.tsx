import { ToolsNav } from "@/components/tools/tools-nav";

const TOP_NAV_ITEMS = [
  { label: "Kripto Araçları", href: "/tools/crypto" },
  { label: "Forex Araçları", href: "/tools/forex" },
  { label: "BIST 100", href: "/tools/bist100" },
  { label: "Ekonomik Takvim", href: "/tools/economic-calendar" },
];

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-body-sm text-primary">Araçlar</p>
        <h1 className="mt-1 text-h4 text-foreground">Kripto, Forex &amp; Ekonomik Veriler</h1>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Gerçek zamanlıya yakın piyasa verileri, hesaplayıcılar ve ekonomik göstergeler.
        </p>
      </div>
      <ToolsNav items={TOP_NAV_ITEMS} />
      {children}
    </div>
  );
}
